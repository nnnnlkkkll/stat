import { Link } from "react-router-dom";

export function Terms() {
  return (
    <div className="legal">
      <header className="land-bar">
        <Link to="/" className="wordmark">
          stat<span>.</span>
        </Link>
        <Link to="/privacy">privacy</Link>
      </header>
      <article className="legal-body">
        <h1>terms of service</h1>
        <p className="legal-updated">last updated september 25, 2026</p>
        <p>
          these terms govern your use of stat. by creating an account or using the service, you agree to them. if you
          do not agree, do not use stat.
        </p>

        <h2>the service</h2>
        <p>
          stat lets you claim a username, customize a public profile, post media, share stories, follow people, send
          friend requests, and exchange private messages. the service is provided as-is and may change or go offline
          without notice.
        </p>

        <h2>your account</h2>
        <ul>
          <li>you must provide accurate registration information and keep your password secret.</li>
          <li>you are responsible for activity on your account.</li>
          <li>usernames are first come, first served and may not impersonate others or use reserved names.</li>
          <li>one person should not create accounts to evade a block, ban, or these terms.</li>
        </ul>

        <h2>your content</h2>
        <p>
          you own the content you post. you grant stat a limited license to host, display, and transmit that content
          so the service can function. you may delete posts, stories, messages you sent, and your account. do not
          upload content you do not have the right to share.
        </p>

        <h2>friends and messages</h2>
        <ul>
          <li>friend requests can be sent, accepted, declined, or cancelled. either friend can remove the friendship.</li>
          <li>blocking someone removes the friendship and stops further requests and messages between you.</li>
          <li>do not harass, spam, or impersonate people in profiles or direct messages.</li>
          <li>voice notes and private chats are for the people in that conversation. do not share them without consent.</li>
        </ul>

        <h2>rules</h2>
        <ul>
          <li>no illegal content, exploitation, or threats.</li>
          <li>no malware, scraping that harms the service, or attempts to access another person's private data.</li>
          <li>no hate, harassment, or sexual content involving minors.</li>
          <li>we may remove content, suspend accounts, or honor reports at our discretion.</li>
        </ul>

        <h2>privacy</h2>
        <p>
          how we handle account, friend, and message data is described in the <Link to="/privacy">privacy policy</Link>.
          that policy is part of these terms.
        </p>

        <h2>disclaimer</h2>
        <p>
          stat is provided without warranties of any kind. we are not liable for lost content, interrupted access,
          or what other users post. your use is at your own risk, to the fullest extent allowed by law.
        </p>

        <h2>changes</h2>
        <p>
          we may update these terms. continued use after an update means you accept the new terms. if a change is
          material, we will note the new date at the top of this page.
        </p>
      </article>
    </div>
  );
}
