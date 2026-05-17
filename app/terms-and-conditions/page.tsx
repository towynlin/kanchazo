export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-mk-bg px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-extrabold text-[34px] text-mk-sky leading-none mb-2">
          Terms and Conditions
        </h1>
        <p className="font-body text-sm text-mk-text-secondary mb-10">
          <em>Last updated: May 16, 2025</em>
        </p>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">Service</h2>
          <p className="font-body text-mk-text leading-relaxed">
            Kanchazo is a free, invite-only team manager for youth sports. Access requires an
            invitation from an existing team member.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">Use of Service</h2>
          <p className="font-body text-mk-text leading-relaxed">
            You agree to use Kanchazo only for lawful purposes and to provide accurate information.
            You are responsible for activity under your account.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">SMS Messaging</h2>
          <p className="font-body text-mk-text leading-relaxed">
            By providing your phone number you consent to receive SMS messages for sign-in and team
            invitations. Message and data rates may apply. Reply STOP to opt out.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">No Warranties</h2>
          <p className="font-body text-mk-text leading-relaxed">
            Kanchazo is provided as-is without warranties of any kind. We may modify or discontinue
            the service at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">Contact</h2>
          <p className="font-body text-mk-text leading-relaxed">
            Questions? Email{" "}
            <a href="mailto:support@kanchazo.com" className="text-mk-sky font-bold underline">
              support@kanchazo.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
