import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LegalHeader } from '../../components/LegalHeader';
import {
  Heading,
  SubHeading,
  Paragraph,
  Bullet,
  Bold,
  Link,
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

export default function TermsScreen() {
  return (
    <View style={s.root}>
      <LegalHeader title="Terms of Use" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.docTitle}>DATA DESK — TERMS OF USE</Text>
        <Text style={s.meta}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Heading>1. ACCEPTANCE OF TERMS</Heading>
        <Paragraph>
          By downloading, installing, or using the Data Desk mobile application (&quot;App&quot;),
          you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to
          these Terms, do not use the App.
        </Paragraph>
        <Paragraph>
          Data Desk is operated by {COMPANY} (RC Number: {RC_NUMBER}), a company duly registered in
          Nigeria under the Companies and Allied Matters Act (CAMA) 2020 (&quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;).
        </Paragraph>
        <Paragraph>
          These Terms constitute a legally binding agreement between you and {COMPANY}.
        </Paragraph>

        <Heading>2. ELIGIBILITY</Heading>
        <Paragraph>To use Data Desk, you must:</Paragraph>
        <Bullet>
          Be at least <Bold>13 years of age</Bold>
        </Bullet>
        <Bullet>
          Have a valid Nigerian mobile phone number on any of the supported networks (MTN, Airtel,
          Glo, or 9mobile)
        </Bullet>
        <Bullet>Have the legal capacity to enter into a binding agreement under Nigerian law</Bullet>
        <Bullet>Not be prohibited from using the App under any applicable law</Bullet>
        <Paragraph>
          By using the App, you represent and warrant that you meet all of the above requirements.
        </Paragraph>

        <Heading>3. YOUR ACCOUNT</Heading>
        <SubHeading>3.1 Registration</SubHeading>
        <Paragraph>
          You must register an account using your valid Nigerian phone number. You will verify your
          identity via a One-Time Password (OTP) sent to that number.
        </Paragraph>
        <SubHeading>3.2 Account Security</SubHeading>
        <Paragraph>
          You are responsible for keeping your account secure. Do not share your OTP or account
          access with anyone. We are not liable for any loss resulting from unauthorized access to
          your account caused by your failure to protect your credentials.
        </Paragraph>
        <SubHeading>3.3 Accurate Information</SubHeading>
        <Paragraph>
          You agree to provide accurate and current information when registering and to update it
          promptly if anything changes.
        </Paragraph>
        <SubHeading>3.4 One Account Per Person</SubHeading>
        <Paragraph>
          You may only maintain one account. Creating multiple accounts to manipulate the points
          system is prohibited and will result in permanent suspension of all associated accounts.
        </Paragraph>

        <Heading>4. THE DATA DESK SERVICE</Heading>
        <SubHeading>4.1 How It Works</SubHeading>
        <Paragraph>Data Desk allows you to:</Paragraph>
        <Bullet>Watch rewarded video advertisements within the App</Bullet>
        <Bullet>Earn Data Points for each ad you watch</Bullet>
        <Bullet>Redeem accumulated Data Points for mobile data bundles on your chosen network</Bullet>
        <SubHeading>4.2 Data Points</SubHeading>
        <Bullet>
          Data Points are a virtual reward currency within Data Desk. They have no monetary value
          and cannot be exchanged for cash, airtime, or any other item outside of what is offered
          in-app.
        </Bullet>
        <Bullet>
          Points are credited to your account upon successful completion of a rewarded ad as
          confirmed by our ad network.
        </Bullet>
        <Bullet>
          Points balances are displayed in the App and are subject to verification. We reserve the
          right to correct any points balance that was awarded in error.
        </Bullet>
        <Bullet>
          Unused points expire after <Bold>12 months</Bold> of account inactivity.
        </Bullet>
        <SubHeading>4.3 Data Bundle Redemption</SubHeading>
        <Bullet>
          Redemptions are processed via third-party VTU providers. Delivery typically occurs within
          a few minutes but may take up to 24 hours in exceptional cases.
        </Bullet>
        <Bullet>
          Once a redemption is submitted and confirmed, it cannot be reversed or refunded, as the
          data bundle is delivered directly to your network carrier.
        </Bullet>
        <Bullet>
          We are not responsible for delays caused by carrier network issues, outages, or
          maintenance on the part of MTN, Airtel, Glo, or 9mobile.
        </Bullet>
        <Bullet>
          Minimum redemption thresholds and bundle options are displayed in-app and may change from
          time to time. We will notify you of significant changes.
        </Bullet>
        <SubHeading>4.4 Ad Availability</SubHeading>
        <Paragraph>
          Ad availability depends on our advertising partners (including Google AdMob) and is not
          guaranteed. We do not control the volume, frequency, or value of ads available to you at
          any given time. Periods of low ad fill are normal and do not constitute a failure of
          service.
        </Paragraph>

        <Heading>5. ACCEPTABLE USE</Heading>
        <Paragraph>
          You agree <Bold>not</Bold> to:
        </Paragraph>
        <Bullet>
          Use bots, scripts, emulators, VPNs, or any automated means to watch ads or earn points
        </Bullet>
        <Bullet>Tamper with, reverse-engineer, or attempt to hack the App or its backend systems</Bullet>
        <Bullet>Create fake accounts or use another person&apos;s phone number without their consent</Bullet>
        <Bullet>Use the App for any unlawful purpose under Nigerian law</Bullet>
        <Bullet>
          Post, transmit, or encourage any content that is defamatory, fraudulent, abusive, or
          harmful
        </Bullet>
        <Bullet>Interfere with the App&apos;s operation or the experience of other users</Bullet>
        <Bullet>
          Attempt to manipulate, falsify, or circumvent the points and redemption system in any way
        </Bullet>
        <Paragraph>
          Violation of any of the above may result in immediate account suspension or permanent ban,
          forfeiture of all accumulated points, and referral to appropriate law enforcement
          authorities where warranted.
        </Paragraph>

        <Heading>6. INTELLECTUAL PROPERTY</Heading>
        <Paragraph>
          All content within Data Desk — including the name, logo, design, graphics, text, software,
          and code — is the property of {COMPANY} or its licensors and is protected under Nigerian
          and international intellectual property laws.
        </Paragraph>
        <Paragraph>
          You are granted a limited, non-exclusive, non-transferable, revocable licence to use the
          App for personal, non-commercial purposes only.
        </Paragraph>
        <Paragraph>
          You may not copy, reproduce, modify, distribute, sell, or create derivative works from any
          part of the App without our prior written consent.
        </Paragraph>

        <Heading>7. THIRD-PARTY SERVICES</Heading>
        <Paragraph>
          Data Desk integrates with third-party services including Google AdMob (ad delivery), VTU
          providers (data bundle fulfilment), and Supabase (infrastructure). Your interactions with
          these services are governed by their own terms and privacy policies. We are not
          responsible for the practices or content of third-party services.
        </Paragraph>
        <Paragraph>
          Ads displayed within the App are served by Google AdMob. We do not endorse and are not
          responsible for the content of those advertisements.
        </Paragraph>

        <Heading>8. DISCLAIMER OF WARRANTIES</Heading>
        <Paragraph>
          Data Desk is provided <Bold>&quot;as is&quot;</Bold> and <Bold>&quot;as available&quot;</Bold>{' '}
          without warranties of any kind, whether express or implied.
        </Paragraph>
        <Paragraph>We do not warrant that:</Paragraph>
        <Bullet>The App will be uninterrupted, error-free, or free of viruses or harmful components</Bullet>
        <Bullet>Any specific volume of ads will be available to you at any time</Bullet>
        <Bullet>Points will always be credited instantly</Bullet>
        <Bullet>Data bundles will be delivered within a specific timeframe</Bullet>
        <Paragraph>
          To the fullest extent permitted by Nigerian law, we disclaim all warranties, express or
          implied, including merchantability, fitness for a particular purpose, and non-infringement.
        </Paragraph>

        <Heading>9. LIMITATION OF LIABILITY</Heading>
        <Paragraph>
          To the maximum extent permitted by law, {COMPANY} shall not be liable for:
        </Paragraph>
        <Bullet>Loss of Data Points due to account termination for policy violations</Bullet>
        <Bullet>Failure or delay in data bundle delivery caused by carrier or VTU provider issues</Bullet>
        <Bullet>Any indirect, incidental, or consequential damages arising from your use of the App</Bullet>
        <Bullet>Loss of data or revenue resulting from App downtime or technical errors</Bullet>
        <Paragraph>
          Our total liability to you for any claim arising from use of the App shall not exceed the
          equivalent in naira of the last redemption you successfully completed in the App.
        </Paragraph>

        <Heading>10. ACCOUNT SUSPENSION AND TERMINATION</Heading>
        <SubHeading>10.1 By Us</SubHeading>
        <Paragraph>
          We reserve the right to suspend or permanently terminate your account at any time if:
        </Paragraph>
        <Bullet>You violate these Terms</Bullet>
        <Bullet>We detect fraudulent, abusive, or manipulative behaviour</Bullet>
        <Bullet>We are required to do so by Nigerian law or court order</Bullet>
        <Bullet>We discontinue the App or a feature of the App</Bullet>
        <Paragraph>
          Upon termination for violations, all accumulated points are forfeited with no compensation.
        </Paragraph>
        <SubHeading>10.2 By You</SubHeading>
        <Paragraph>
          You may delete your account at any time from within the App settings. Upon deletion, your
          personal data will be erased within 30 days in accordance with our Privacy Policy, and any
          remaining unredeemed points will be permanently lost.
        </Paragraph>

        <Heading>11. CHANGES TO THE APP AND THESE TERMS</Heading>
        <Paragraph>
          We may update these Terms at any time. When we do, we will notify you via an in-app notice
          and update the effective date at the top. Your continued use of the App after the
          effective date of any changes constitutes your acceptance of the new Terms.
        </Paragraph>
        <Paragraph>
          We may also modify, suspend, or discontinue any feature of the App at any time without
          liability to you.
        </Paragraph>

        <Heading>12. GOVERNING LAW AND DISPUTE RESOLUTION</Heading>
        <Paragraph>
          These Terms are governed by and construed in accordance with the laws of the{' '}
          <Bold>Federal Republic of Nigeria</Bold>.
        </Paragraph>
        <Paragraph>
          Any dispute arising from these Terms or your use of the App shall first be attempted to be
          resolved amicably by contacting us at{' '}
          <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>. If unresolved within 30 days,
          the matter shall be referred to the appropriate courts in Nigeria with jurisdiction over
          the subject matter.
        </Paragraph>

        <Heading>13. SEVERABILITY</Heading>
        <Paragraph>
          If any provision of these Terms is found to be invalid or unenforceable under Nigerian law,
          that provision shall be modified to the minimum extent necessary to make it enforceable,
          and the remaining provisions shall continue in full force and effect.
        </Paragraph>

        <Heading>14. ENTIRE AGREEMENT</Heading>
        <Paragraph>
          These Terms, together with our Privacy Policy, constitute the entire agreement between you
          and {COMPANY} regarding your use of Data Desk, and supersede all prior agreements and
          understandings.
        </Paragraph>

        <Heading>15. CONTACT US</Heading>
        <Paragraph>If you have any questions about these Terms, please contact us:</Paragraph>
        <Paragraph>{COMPANY}</Paragraph>
        <Paragraph>{REGISTERED_ADDRESS}</Paragraph>
        <Paragraph>
          Email: <Link url={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Paragraph>
        <Paragraph>
          Privacy queries: <Link url={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</Link>
        </Paragraph>

        <Text style={s.footerNote}>
          {COMPANY} reserves all rights not expressly granted herein.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
