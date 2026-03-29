import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const serverSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const NHOST_GRAPHQL = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.hasura.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/graphql`;
const ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET!;

async function nhostQuery(query: string, variables: Record<string, unknown>) {
  const res = await fetch(NHOST_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    // Verify Supabase session
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error } = await serverSupabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const { action, payload } = body;
    const userId = user.id;

  // GET SINGLE CONVERSATION
  if (action === "get_conversation") {
    const { conversationId } = payload;
    const data = await nhostQuery(`
      query GetConversation($id: uuid!) {
        conversations_by_pk(id: $id) {
          id user1_id user2_id disappearing_user1 disappearing_user2
        }
      }
    `, { id: conversationId });
    return NextResponse.json(data);
  }

  // GET CONVERSATIONS
  if (action === "get_conversations") {
    const data = await nhostQuery(`
      query GetConversations($userId: uuid!) {
        conversations(
          where: { _or: [{ user1_id: { _eq: $userId } }, { user2_id: { _eq: $userId } }] }
          order_by: { last_message_at: desc }
        ) {
          id user1_id user2_id last_message last_message_at created_at
        }
      }
    `, { userId });
    return NextResponse.json(data);
  }

  // GET OR CREATE CONVERSATION
  if (action === "get_or_create_conversation") {
    const { otherUserId } = payload;
    const user1_id = userId < otherUserId ? userId : otherUserId;
    const user2_id = userId < otherUserId ? otherUserId : userId;

    // Try to find existing
    const existing = await nhostQuery(`
      query FindConversation($user1_id: uuid!, $user2_id: uuid!) {
        conversations(where: { user1_id: { _eq: $user1_id }, user2_id: { _eq: $user2_id } }) {
          id user1_id user2_id
        }
      }
    `, { user1_id, user2_id });

    if (existing.data?.conversations?.[0]) {
      return NextResponse.json({ conversationId: existing.data.conversations[0].id });
    }

    // Create new
    const created = await nhostQuery(`
      mutation CreateConversation($user1_id: uuid!, $user2_id: uuid!) {
        insert_conversations_one(object: { user1_id: $user1_id, user2_id: $user2_id }) {
          id
        }
      }
    `, { user1_id, user2_id });

    return NextResponse.json({ conversationId: created.data?.insert_conversations_one?.id });
  }

  // GET MESSAGES
  if (action === "get_messages") {
    const { conversationId } = payload;
    const data = await nhostQuery(`
      query GetMessages($conversationId: uuid!) {
        messages(
          where: { conversation_id: { _eq: $conversationId } }
          order_by: { created_at: asc }
        ) {
          id content sender_id seen created_at
        }
      }
    `, { conversationId });
    return NextResponse.json(data);
  }

  // SEND MESSAGE
  if (action === "send_message") {
    const { conversationId, content, disappearingFor } = payload;
    const displayContent = content.startsWith("__VOICE__:") ? "🎤 Voice note" : content.startsWith("__SHARE__:") ? "📎 Shared a post" : content;
    const data = await nhostQuery(`
      mutation SendMessage($conversationId: uuid!, $senderId: uuid!, $content: String!, $display: String!, $disappearingFor: uuid) {
        insert_messages_one(object: {
          conversation_id: $conversationId,
          sender_id: $senderId,
          content: $content,
          disappearing_for: $disappearingFor
        }) { id created_at }
        update_conversations(where: {id: {_eq: $conversationId}}, _set: {last_message: $display, last_message_at: "now()"}) { affected_rows }
      }
    `, { conversationId, senderId: userId, content, display: displayContent, disappearingFor: disappearingFor ?? null });
    return NextResponse.json(data);
  }

  // MARK SEEN
  if (action === "mark_seen") {
    const { conversationId } = payload;
    const data = await nhostQuery(`
      mutation MarkSeen($conversationId: uuid!, $userId: uuid!) {
        update_messages(
          where: { conversation_id: { _eq: $conversationId }, sender_id: { _neq: $userId }, seen: { _eq: false } }
          _set: { seen: true }
        ) { affected_rows }
      }
    `, { conversationId, userId });
    return NextResponse.json(data);
  }

  // TOGGLE DISAPPEARING MODE
  if (action === "toggle_disappearing") {
    const { conversationId, enable } = payload;
    // figure out which column belongs to this user
    const conv = await nhostQuery(`
      query GetConv($id: uuid!) {
        conversations_by_pk(id: $id) { user1_id user2_id disappearing_user1 disappearing_user2 }
      }
    `, { id: conversationId });
    const c = conv.data?.conversations_by_pk;
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const col = c.user1_id === userId ? "disappearing_user1" : "disappearing_user2";
    await nhostQuery(`
      mutation ToggleDisappearing($id: uuid!, $val: Boolean!) {
        update_conversations_by_pk(pk_columns: {id: $id}, _set: { ${col}: $val }) { id }
      }
    `, { id: conversationId, val: enable });
    return NextResponse.json({ success: true, enabled: enable });
  }

  // CLEAR DISAPPEARING MESSAGES FOR THIS USER (called on leave)
  if (action === "clear_disappearing_messages") {
    const { conversationId } = payload;
    // Only delete messages that were explicitly tagged with this user's id
    await nhostQuery(`
      mutation ClearDisappearing($conversationId: uuid!, $userId: uuid!) {
        delete_messages(
          where: {
            conversation_id: { _eq: $conversationId }
            disappearing_for: { _eq: $userId }
          }
        ) { affected_rows }
      }
    `, { conversationId, userId });
    // Also reset the disappearing flag in the conversation
    const conv = await nhostQuery(`
      query GetConv($id: uuid!) {
        conversations_by_pk(id: $id) { user1_id user2_id }
      }
    `, { id: conversationId });
    const c = conv.data?.conversations_by_pk;
    if (c) {
      const col = c.user1_id === userId ? "disappearing_user1" : "disappearing_user2";
      await nhostQuery(`
        mutation ResetDisappearing($id: uuid!) {
          update_conversations_by_pk(pk_columns: {id: $id}, _set: { ${col}: false }) { id }
        }
      `, { id: conversationId });
    }
    return NextResponse.json({ success: true });
  }

  // DELETE CONVERSATION
  if (action === "delete_conversation") {
    const { conversationId } = payload;
    await nhostQuery(`
      mutation DeleteConversation($id: uuid!, $userId: uuid!) {
        delete_messages(where: { conversation_id: { _eq: $id } }) { affected_rows }
        delete_conversations(where: { id: { _eq: $id }, _or: [{ user1_id: { _eq: $userId } }, { user2_id: { _eq: $userId } }] }) { affected_rows }
      }
    `, { id: conversationId, userId });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[chat/route] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
