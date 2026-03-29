-- ============================================================
-- NOTIFICATIONS SYSTEM
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- who receives it
  actor_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,  -- who triggered it
  type        text NOT NULL,   -- 'follow' | 'like_post' | 'like_reel' | 'comment_post' | 'comment_reel' | 'like_story'
  post_id     uuid REFERENCES posts(id) ON DELETE CASCADE,
  reel_id     uuid REFERENCES reels(id) ON DELETE CASCADE,
  story_id    uuid REFERENCES stories(id) ON DELETE CASCADE,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id, created_at DESC);

-- ============================================================
-- 2. RLS Policies
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone authenticated can insert (triggers run as postgres, but direct inserts too)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

-- Users can mark their own as read
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. Trigger: new follow → notify the followed user
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Don't notify if following yourself
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ============================================================
-- 4. Trigger: post like → notify post owner
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, actor_id, type, post_id)
    VALUES (v_owner, NEW.user_id, 'like_post', NEW.post_id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON likes;
CREATE TRIGGER trg_notify_post_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();

-- ============================================================
-- 5. Trigger: reel like → notify reel owner
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_reel_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM reels WHERE id = NEW.reel_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  INSERT INTO notifications(user_id, actor_id, type, reel_id)
    VALUES (v_owner, NEW.user_id, 'like_reel', NEW.reel_id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_reel_like ON reel_likes;
CREATE TRIGGER trg_notify_reel_like
  AFTER INSERT ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_reel_like();

-- ============================================================
-- 6. Trigger: comment → notify post/reel owner
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_owner uuid;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO v_owner FROM posts WHERE id = NEW.post_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      INSERT INTO notifications(user_id, actor_id, type, post_id)
        VALUES (v_owner, NEW.user_id, 'comment_post', NEW.post_id)
        ON CONFLICT DO NOTHING;
    END IF;
  ELSIF NEW.reel_id IS NOT NULL THEN
    SELECT user_id INTO v_owner FROM reels WHERE id = NEW.reel_id;
    IF v_owner IS NOT NULL AND v_owner <> NEW.user_id THEN
      INSERT INTO notifications(user_id, actor_id, type, reel_id)
        VALUES (v_owner, NEW.user_id, 'comment_reel', NEW.reel_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();
