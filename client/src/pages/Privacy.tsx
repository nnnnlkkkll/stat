import { Link } from "react-router-dom";

export function Privacy() {
  return (
    <div className="legal">
      <header className="land-bar">
        <Link to="/" className="wordmark">
          stat<span>.</span>
        </Link>
        <Link to="/terms">terms</Link>
      </header>
      <article className="legal-body">
        <h1>privacy policy</h1>
        <p className="legal-updated">last updated september 25, 2026</p>
        <p>
          stat is a social profile network. this policy explains what we collect, how we use it, and the choices you
          have. if you do not agree, do not use the service.
        </p>

        <h2>what we collect</h2>
        <ul>
          <li>account data you give us: username, display name, email, and password hash.</li>
          <li>profile content you publish: bio, links, photos, videos, music, posts, and stories.</li>
          <li>social graph data: follows, likes, saves, friend requests, friendships, and blocks.</li>
          <li>private messages you send, including text, replies, reactions, read state, and voice notes.</li>
          <li>technical data needed to run the app: session cookies, last login / last seen, and upload metadata.</li>
        </ul>

        <h2>how we use it</h2>
        <ul>
          <li>to operate your account, profile, posts, stories, friends, and direct messages.</li>
          <li>to show you discover, search, notifications, and people you already interact with.</li>
          <li>to enforce blocks, reports, and the friend / message rules you set.</li>
          <li>to keep you signed in with an http-only session cookie.</li>
        </ul>

        <h2>messages and voice notes</h2>
        <p>
          direct messages are private to the people in that conversation. we store message text, optional reply and
          reaction metadata, and voice-note files as upload references. typing indicators are temporary and are not
          stored as messages. if you turn read receipts off, we do not expose your read status to the other person.
        </p>

        <h2>who can see what</h2>
        <ul>
          <li>public profiles, posts, and stories are visible according to your privacy and follow settings.</li>
          <li>friend lists and requests are visible to you. other people only see the relationship they have with you.</li>
          <li>direct messages and voice notes are visible only to conversation members.</li>
          <li>we do not sell your personal data.</li>
        </ul>

        <h2>cookies</h2>
        <p>
          we use a session cookie so you stay signed in. we may also remember your theme in local storage on your
          device. we do not use third-party advertising cookies.
        </p>

        <h2>how long we keep it</h2>
        <p>
          we keep account, profile, friend, and message data while your account exists. deleting your account removes
          your profile, posts, stories, and messages you sent, subject to backups used for reliability and abuse
          review.
        </p>

        <h2>your choices</h2>
        <ul>
          <li>edit or delete profile content, posts, stories, and your own messages.</li>
          <li>accept, decline, cancel, or remove friendships, and block people.</li>
          <li>control who can message you and whether read receipts are on.</li>
          <li>delete your account from settings.</li>
        </ul>

        <h2>contact</h2>
        <p>
          questions about this policy can be sent through the in-app report tools or the account email on your profile
          settings. by using stat you also agree to the <Link to="/terms">terms of service</Link>.
        </p>
      </article>
    </div>
  );
}
