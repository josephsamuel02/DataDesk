import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LegalHeader } from '../../components/LegalHeader';
import {
  Heading,
  Paragraph,
  Bullet,
  Bold,
  Link,
  Table,
  legalStyles as s,
} from '../../components/LegalText';

// ─── Company / contact details ──────────────────────────────────────────────
// TODO: confirm these before launch.
const COMPANY = 'Salem Innovative Ventures';
const RC_NUMBER = '9166515';
const REGISTERED_ADDRESS = 'Lagos, Nigeria'; // TODO: replace with full registered address
const PRIVACY_EMAIL = 'privacy@datadesk.name.ng'; // TODO: confirm alias is live
const SUPPORT_EMAIL = 'support@datadesk.name.ng'; // TODO: confirm alias is live
const EFFECTIVE_DATE = 'July 1, 2026';

export default function PrivacyPolicyScreen() {
  return (
    <View style={s.root}>
      <LegalHeader title="Privacy Policy" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.docTitle}>DATA DESK — PRIVACY POLICY</Text>
        <Text style={s.meta}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Heading>1. WHO WE ARE</Heading>
        <Paragraph>
          Data Desk is a mobile application operated by {COMPANY} (RC Number: {RC_NUMBER}), a
          company registered under the Companies and Allied Matters Act (CAMA) 2020 in Nigeria.
          Our registered address is {REGISTERED_ADDRESS}.
        </Paragraph>
        <Paragraph>
          We can be reached at: <Link url={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</Link>
        </Paragraph>
        <Paragraph>
          This Privacy Policy explains how we collect, use, store, and protect your personal data
          when you use the Data Desk app. It is governed by the Nigeria Data Protection Act, 2023
          (NDPA) and its General Application and Implementation Directive (GAID), 2025.
        </Paragraph>

        <Heading>2. WHAT DATA WE COLLECT</Heading>
        <Paragraph>When you use Data Desk, we may collect:</Paragraph>
        <Bullet>
          <Bold>Phone number</Bold> — used for account creation, OTP verification, and data bundle
          delivery
        </Bullet>
        <Bullet>
          <Bold>Network carrier</Bold> — to route your data redemptions to the correct network
          (MTN, Airtel, Glo, or 9mobile)
        </Bullet>
        <Bullet>
          <Bold>Device information</Bold> — device model, OS version, and app version, for
          compatibility and debugging
        </Bullet>
        <Bullet>
          <Bold>Usage data</Bold> — ads watched, points earned, redemptions made, and session
          activity, for app functionality and fraud prevention
        </Bullet>
        <Bullet>
          <Bold>IP address and approximate location</Bold> — for security monitoring and compliance
        </Bullet>
        <Bullet>
          <Bold>Email address</Bold> (if provided) — for transactional notifications
        </Bullet>
        <Paragraph>
          We do <Bold>not</Bold> collect your BVN, NIN, bank account details, or any financial
          credentials.
        </Paragraph>

        <Heading>3. WHY WE COLLECT YOUR DATA (LAWFUL BASIS)</Heading>
        <Paragraph>
          Under the NDPA 2023, we process your data based on the following lawful grounds:
        </Paragraph>
        <Table
          head={['Purpose', 'Lawful Basis']}
          rows={[
            ['Account creation and authentication', 'Contract performance'],
            ['Delivering data bundles you redeem', 'Contract performance'],
            ['Showing you rewarded ads', 'Legitimate interest / Consent'],
            ['Preventing fraud and abuse', 'Legitimate interest'],
            ['Sending account and transaction notifications', 'Contract performance'],
            ['Improving the app and fixing bugs', 'Legitimate interest'],
            ['Complying with legal obligations', 'Legal obligation'],
          ]}
        />

        <Heading>4. HOW WE USE YOUR DATA</Heading>
        <Paragraph>We use your data to:</Paragraph>
        <Bullet>Create and manage your Data Desk account</Bullet>
        <Bullet>Verify your identity via OTP</Bullet>
        <Bullet>Track your points balance and redemption history</Bullet>
        <Bullet>Deliver mobile data bundles to your phone number</Bullet>
        <Bullet>Show you rewarded video ads through Google AdMob</Bullet>
        <Bullet>Detect and prevent fraudulent activity</Bullet>
        <Bullet>Send you important account notifications (not marketing spam)</Bullet>
        <Bullet>Improve and maintain the app</Bullet>

        <Heading>5. WHO WE SHARE YOUR DATA WITH</Heading>
        <Paragraph>We do not sell your personal data. We may share it only with:</Paragraph>
        <Bullet>
          <Bold>VTU API providers</Bold> (e.g., VTU.ng, eBills Africa) — to fulfil your data bundle
          redemptions. They receive only your phone number and network carrier.
        </Bullet>
        <Bullet>
          <Bold>Google AdMob</Bold> — our ad network, which may collect device identifiers for ad
          delivery. See <Link url="https://policies.google.com/privacy">Google&apos;s Privacy Policy</Link>.
        </Bullet>
        <Bullet>
          <Bold>Supabase</Bold> — our database and authentication provider. Data is stored securely
          in their infrastructure.
        </Bullet>
        <Bullet>
          <Bold>Resend.com</Bold> — for transactional emails, if applicable.
        </Bullet>
        <Bullet>
          <Bold>Law enforcement or regulators</Bold> — only if required by Nigerian law or a valid
          court order.
        </Bullet>
        <Paragraph>
          All third parties we work with are contractually required to protect your data.
        </Paragraph>

        <Heading>6. DATA STORAGE AND SECURITY</Heading>
        <Paragraph>
          Your data is stored on secure cloud servers (Supabase infrastructure). We implement:
        </Paragraph>
        <Bullet>End-to-end encryption for data in transit (HTTPS/TLS)</Bullet>
        <Bullet>Encryption at rest for sensitive fields</Bullet>
        <Bullet>Access controls limiting who can view your data internally</Bullet>
        <Bullet>Regular security reviews</Bullet>
        <Paragraph>
          We will notify you and the Nigeria Data Protection Commission (NDPC) within 72 hours if a
          data breach occurs that affects your rights.
        </Paragraph>

        <Heading>7. HOW LONG WE KEEP YOUR DATA</Heading>
        <Table
          head={['Data Type', 'Retention Period']}
          rows={[
            ['Account data (phone, carrier)', 'For the life of your account + 1 year'],
            ['Transaction/redemption records', '3 years (legal compliance)'],
            ['Ad watch logs (for points)', '12 months'],
            ['Device/session logs', '90 days'],
          ]}
        />
        <Paragraph>
          When your account is deleted, we erase your personal data within 30 days, except where
          retention is required by law.
        </Paragraph>

        <Heading>8. YOUR RIGHTS UNDER THE NDPA 2023</Heading>
        <Paragraph>As a Nigerian data subject, you have the right to:</Paragraph>
        <Bullet>
          <Bold>Access</Bold> — request a copy of the personal data we hold about you
        </Bullet>
        <Bullet>
          <Bold>Correction</Bold> — ask us to fix inaccurate or incomplete data
        </Bullet>
        <Bullet>
          <Bold>Deletion</Bold> — request that we delete your account and personal data
        </Bullet>
        <Bullet>
          <Bold>Objection</Bold> — object to certain processing activities
        </Bullet>
        <Bullet>
          <Bold>Data portability</Bold> — receive your data in a machine-readable format
        </Bullet>
        <Bullet>
          <Bold>Withdraw consent</Bold> — where processing is based on consent, you can withdraw it
          at any time
        </Bullet>
        <Paragraph>
          To exercise any of these rights, contact us at{' '}
          <Link url={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</Link>. We will respond within 30
          days.
        </Paragraph>
        <Paragraph>
          If you are unsatisfied with our response, you may lodge a complaint with the Nigeria Data
          Protection Commission (NDPC) at <Link url="https://ndpc.gov.ng">ndpc.gov.ng</Link>.
        </Paragraph>

        <Heading>9. CHILDREN&apos;S PRIVACY</Heading>
        <Paragraph>
          Data Desk is not intended for users under the age of 13. We do not knowingly collect
          personal data from children. If we discover that a child&apos;s data has been collected,
          we will delete it promptly.
        </Paragraph>

        <Heading>10. CHANGES TO THIS POLICY</Heading>
        <Paragraph>
          We may update this Privacy Policy from time to time. When we do, we will notify you in-app
          and update the effective date at the top. Continued use of the app after changes
          constitutes your acceptance.
        </Paragraph>

        <Heading>11. CONTACT US</Heading>
        <Paragraph>{COMPANY}</Paragraph>
        <Paragraph>{REGISTERED_ADDRESS}</Paragraph>
        <Paragraph>
          Email: <Link url={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</Link>
        </Paragraph>
        <Paragraph>
          Support: <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Paragraph>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
