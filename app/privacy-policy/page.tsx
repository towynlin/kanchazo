export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-mk-bg px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-extrabold text-[34px] text-mk-sky leading-none mb-2">
          Privacy Policy
        </h1>
        <p className="font-body text-sm text-mk-text-secondary mb-10">
          <em>Last updated: May 16, 2025</em>
        </p>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">About Kanchazo</h2>
          <p className="font-body text-mk-text leading-relaxed">
            Kanchazo is a free, invite-only team manager for youth sports. There are no ads.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">Data We Collect</h2>
          <p className="font-body text-mk-text leading-relaxed">
            We collect your name, team activity you enter, and any contact details you choose to
            share (email, phone number). Contact details are shown only to your teammates on the
            roster. Sign-in uses passkeys — we never send SMS messages.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">
            How We Use Your Data
          </h2>
          <p className="font-body text-mk-text leading-relaxed">
            Your data is used solely to operate the service. Team activity is visible only to
            members of your team. We do not share, sell, or disclose your data to third parties
            without your explicit consent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-extrabold text-xl text-mk-text mb-2">Data Deletion</h2>
          <p className="font-body text-mk-text leading-relaxed">
            You may request deletion of your data at any time in the app. We will delete your
            account and associated data promptly.
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
