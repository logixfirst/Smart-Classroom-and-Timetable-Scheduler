import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Privacy Policy — Cadence',
  description: 'How Cadence collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div style={{ background: 'white' }}>
      <section style={{ background: 'var(--cadence-off-white)', borderBottom: '1px solid rgba(27,58,92,0.08)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="mk-eyebrow">Legal</span>
        <h1 className="mk-h1" style={{ marginTop: '8px' }}>Privacy Policy</h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)', marginTop: '12px' }}>
          Last updated: February 27, 2026
        </p>
      </section>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px', fontFamily: 'Inter, sans-serif', fontSize: '16px', lineHeight: 1.75, color: 'var(--cadence-slate)' }}>
        <Section title="1. Information We Collect">
          <p>We collect information you provide directly, including name, email address, institution name, phone number, and role when you submit a demo request or create an account.</p>
          <p>We also collect usage data including pages visited, features used, and timetable generation activity to improve the product.</p>
        </Section>
        <Section title="2. How We Use Your Information">
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve the Cadence platform</li>
            <li>Respond to demo requests and support inquiries</li>
            <li>Send product updates and important notices (you can unsubscribe at any time)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>
        <Section title="3. Data Storage and Security">
          <p>All data is stored on servers located in India. We use industry-standard encryption (TLS 1.3) for data in transit and AES-256 for data at rest.</p>
          <p>Authentication uses HttpOnly JWT cookies, preventing client-side token theft. Passwords are hashed using Argon2, the winner of the Password Hashing Competition.</p>
        </Section>
        <Section title="4. Data Sharing">
          <p>We do not sell, trade, or share your personal data with third parties for marketing purposes. We may share data with service providers who assist in operating the platform (hosting, email delivery) under strict data processing agreements.</p>
        </Section>
        <Section title="5. Data Retention">
          <p>We retain your data for as long as your account is active, or as needed to provide services. Upon account cancellation, your data is retained for 30 days and then permanently deleted upon request.</p>
        </Section>
        <Section title="6. Your Rights">
          <p>You have the right to access, correct, or delete your personal data at any time. Contact us at <a href="mailto:hello@cadence.edu" style={{ color: 'var(--cadence-teal)' }}>hello@cadence.edu</a> to exercise these rights.</p>
        </Section>
        <Section title="7. Contact">
          <p>For privacy-related inquiries, contact us at <a href="mailto:hello@cadence.edu" style={{ color: 'var(--cadence-teal)' }}>hello@cadence.edu</a>.</p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 600, color: 'var(--cadence-ink)', marginBottom: '16px' }}>
        {title}
      </h2>
      <div className="[&_p]:mb-[14px] [&_ul]:list-disc [&_ul]:pl-[24px] [&_ul]:mb-[14px] [&_li]:mb-[8px]">
        {children}
      </div>
    </div>
  )
}
