import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { THEME } from '../constants/theme';

// ─── Shared building blocks for the legal screens (privacy / terms) ─────────

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function SubHeading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subHeading}>{children}</Text>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Bold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

export function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export function Link({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <Text style={styles.link} onPress={() => Linking.openURL(url)}>
      {children}
    </Text>
  );
}

export function Table({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeadRow]}>
        <Text style={[styles.tableCell, styles.tableHeadCell]}>{head[0]}</Text>
        <Text style={[styles.tableCell, styles.tableHeadCell]}>{head[1]}</Text>
      </View>
      {rows.map((r, i) => (
        <View
          key={r[0]}
          style={[styles.tableRow, i % 2 === 0 ? styles.tableRowAlt : styles.tableRowPlain]}
        >
          <Text style={styles.tableCell}>{r[0]}</Text>
          <Text style={styles.tableCell}>{r[1]}</Text>
        </View>
      ))}
    </View>
  );
}

// Screen scaffolding shared by both legal screens.
export const legalStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.card },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  docTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.extraBold,
    color: THEME.colors.text,
    marginBottom: 8,
  },
  meta: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  footerNote: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 18,
  },
});

const styles = StyleSheet.create({
  heading: {
    fontSize: 15,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginTop: 22,
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#1a1a1a',
    marginBottom: 10,
  },
  bold: { fontWeight: THEME.fontWeight.bold, color: '#1a1a1a' },
  link: { color: THEME.colors.primary, fontWeight: THEME.fontWeight.semiBold },

  bulletRow: { flexDirection: 'row', marginBottom: 7, paddingRight: 6 },
  bulletDot: {
    fontSize: 13.5,
    lineHeight: 22,
    color: THEME.colors.primary,
    marginRight: 8,
  },
  bulletText: { flex: 1, fontSize: 13.5, lineHeight: 22, color: '#1a1a1a' },

  table: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 12,
  },
  tableRow: { flexDirection: 'row' },
  tableHeadRow: { backgroundColor: THEME.colors.primary },
  tableRowAlt: { backgroundColor: '#f5f5f5' },
  tableRowPlain: { backgroundColor: '#FFFFFF' },
  tableCell: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeadCell: {
    color: '#FFFFFF',
    fontWeight: THEME.fontWeight.bold,
  },
});
