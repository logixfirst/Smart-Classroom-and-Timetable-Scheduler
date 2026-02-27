import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Terms of Service — Cadence',
  description: 'The terms and conditions governing use of the Cadence platform.',
}

export default function TermsPage() {
  return (
    <div style={{ background: 'white' }}>
      <section style={{ background: 'var(--cadence-off-white)', borderBottom: '1px solid rgba(27,58,92,0.08)', padding: '56px 24px 48px', textAlign: 'center' }}>
        <span className="mk-eyebrow">Legal</span>
        <h1 className="mk-h1" style={{ marginTop: '8px' }}>Terms of Service</h1>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: 'var(--cadence-slate)', marginTop: '12px' }}>
          Last updated: February 27, 2026
        </p>
      </section>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '56px 24px 80px', fontFamily: 'Inter, sans-serif', fontSize: '16px', lineHeight: 1.75, color: 'var(--cadence-slate)' }}>
        <Section title="1. Acceptance of Terms">
          <p>By accessing or using the Cadence platform, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
        </Section>
        <Section title="2. Use of the Platform">
          <p>You may use the Cadence platform only for lawful purposes and in accordance with these Terms. You agree not to:</p>
          <ul>
            <li>Use the platform for any fraudulent or unlawful purpose</li>
            <li>Attempt to gain unauthorised access to any part of the platform</li>
            <li>Reverse-engineer, decompile, or disassemble any part of the platform</li>
            <li>Share account credentials with unauthorised users</li>
          </ul>
        </Section>
        <Section title="3. Institutional Accounts">
          <p>If you create an account on behalf of an institution, you represent that you have the authority to bind that institution to these Terms. The institution is responsible for all activity under its account.</p>
        </Section>
        <Section title="4. Intellectual Property">
          <p>The Cadence platform, including its AI algorithms, user interface, and documentation, is proprietary software. No IP rights are transferred to users. You retain ownership of all data you input into the platform.</p>
        </Section>
        <Section title="5. Disclaimer of Warranties">
          <p>The platform is provided &quot;as is&quot; without warranty of any kind. While we guarantee zero scheduling conflicts within the defined constraints, we do not warrant uninterrupted or error-free operation.</p>
        </Section>
        <Section title="6. Limitation of Liability">
          <p>Cadence&apos;s liability shall not exceed the fees paid by the institution in the three months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>
        </Section>
        <Section title="7. Termination">
          <p>We reserve the right to terminate or suspend access to the platform for breach of these Terms, with or without notice.</p>
        </Section>
        <Section title="8. Governing Law">
          <p>These Terms are governed by the laws of India. Disputes shall be resolved in the courts of Karnataka, India.</p>
        </Section>
        <Section title="9. Contact">
          <p>For legal inquiries, contact us at <a href="mailto:hello@cadence.edu" style={{ color: 'var(--cadence-teal)' }}>hello@cadence.edu</a>.</p>
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
