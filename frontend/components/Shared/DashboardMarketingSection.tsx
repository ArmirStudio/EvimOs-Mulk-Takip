import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ImageBackground, Image, Linking,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import type { AdCampaign } from '@shared/campaign';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';

export type { AdCampaign } from '@shared/campaign';

interface Props {
  campaigns: AdCampaign[];
}

const shadow = (color = '#000', opacity = 0.05, radius = 4, elevation = 2) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

export default function DashboardMarketingSection({ campaigns }: Props) {
  const theme = useAppTheme();
  const s = useStyles();
  const c = theme.colors.stitch;

  const inlineAds = campaigns.filter(a => a.type === 'inline_ad');
  const news = campaigns.filter(a => a.type === 'news');
  const testimonials = campaigns.filter(a => a.type === 'testimonial');
  const services = campaigns.filter(a => a.type === 'service');

  const openLink = async (url?: string | null) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  if (inlineAds.length === 0 && news.length === 0 && testimonials.length === 0 && services.length === 0) {
    return null;
  }

  return (
    <>
      {/* Inline Ads — Horizontal project cards */}
      {inlineAds.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{tr.agent.sponsoredProjects}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {inlineAds.map(ad => (
              <TouchableOpacity
                key={ad.id}
                style={s.projectCard}
                onPress={() => openLink(ad.link_url)}
                activeOpacity={ad.link_url ? 0.7 : 1}
              >
                {ad.image_url ? (
                  <ImageBackground source={{ uri: ad.image_url }} style={s.projectImg} />
                ) : (
                  <View style={[s.projectImg, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={40} color={c.textMuted} />
                  </View>
                )}
                <View style={s.projectInfo}>
                  <Text style={s.projectTitle} numberOfLines={2}>{ad.title}</Text>
                  {ad.body ? <Text style={s.projectSub} numberOfLines={2}>{ad.body}</Text> : null}
                  {ad.link_url && (
                    <TouchableOpacity style={s.projectBtn} onPress={() => openLink(ad.link_url)}>
                      <Text style={s.projectBtnText}>{tr.agent.seeAll}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* News — Vertical stacked cards */}
      {news.length > 0 && (
        <View style={s.sectionPx}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>{tr.agent.news}</Text>
          <View style={s.newsStack}>
            {news.map(item => (
              <TouchableOpacity
                key={item.id}
                style={s.newsCard}
                onPress={() => openLink(item.link_url)}
                activeOpacity={item.link_url ? 0.7 : 1}
              >
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={s.newsImg} />
                ) : (
                  <View style={[s.newsImg, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="newspaper-outline" size={28} color={c.textMuted} />
                  </View>
                )}
                <View style={s.newsContent}>
                  <View>
                    <Text style={s.newsTitle} numberOfLines={1}>{item.title}</Text>
                    {item.body ? <Text style={s.newsSub} numberOfLines={2}>{item.body}</Text> : null}
                  </View>
                  {item.link_url && (
                    <TouchableOpacity onPress={() => openLink(item.link_url)}>
                      <Text style={s.newsLink}>{tr.agent.readMore}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Testimonials — Horizontal scroll */}
      {testimonials.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>
            {tr.content.happyClients}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {testimonials.map(t => (
              <View key={t.id} style={s.clientCard}>
                <View style={s.clientHeader}>
                  {t.client_avatar ? (
                    <Image source={{ uri: t.client_avatar }} style={s.clientAvatar} />
                  ) : (
                    <View style={[s.clientAvatar, { backgroundColor: c.orange50, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontWeight: '700', color: c.primary }}>
                        {(t.client_name || t.title || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={s.clientName}>{t.client_name || t.title}</Text>
                    <View style={s.starsRow}>
                      {Array.from({ length: Math.floor(t.client_rating || 5) }).map((_, i) => (
                        <MaterialIcons key={i} name="star" size={12} color={c.orange400} />
                      ))}
                      {(t.client_rating || 5) % 1 >= 0.5 && (
                        <MaterialIcons name="star-half" size={12} color={c.orange400} />
                      )}
                    </View>
                  </View>
                </View>
                {t.body && <Text style={s.clientQuote}>&quot;{t.body}&quot;</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Services — Horizontal partner logos */}
      {services.length > 0 && (
        <View style={{ paddingBottom: 32 }}>
          <Text style={s.partnersTitle}>{tr.agent.partners}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.partnersScroll}>
            {services.map(svc => (
              <TouchableOpacity
                key={svc.id}
                style={s.partnerItem}
                onPress={() => openLink(svc.link_url)}
                activeOpacity={svc.link_url ? 0.7 : 1}
              >
                {svc.service_icon ? (
                  <MaterialIcons name={svc.service_icon as any} size={24} color={c.textMuted} />
                ) : (
                  <Ionicons name="business-outline" size={24} color={c.textMuted} />
                )}
                <Text style={s.partnerText}>{svc.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors.stitch;
  return StyleSheet.create({
    section: { marginBottom: 24 },
    sectionPx: { paddingHorizontal: 16, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: c.textBrown },
    hScroll: { paddingHorizontal: 16, gap: 16 },
    projectCard: { width: 280, backgroundColor: c.cardBg, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.orange50, ...shadow() },
    projectImg: { height: 160, width: '100%', backgroundColor: theme.colors.surface2 },
    projectInfo: { padding: 16 },
    projectTitle: { fontSize: 16, fontWeight: '700', color: c.textBrown, marginBottom: 4 },
    projectSub: { fontSize: 12, color: c.textMuted, marginBottom: 16 },
    projectBtn: { backgroundColor: c.primary, paddingVertical: 8, borderRadius: 8, alignItems: 'center', ...shadow(c.orange200, 0.4, 4, 3) },
    projectBtnText: { color: c.cardBg, fontSize: 14, fontWeight: '700' },
    newsStack: { gap: 12 },
    newsCard: { flexDirection: 'row', backgroundColor: c.cardBg, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: c.orange50, gap: 12, ...shadow() },
    newsImg: { width: 96, height: 96, borderRadius: 8, backgroundColor: theme.colors.surface2 },
    newsContent: { flex: 1, justifyContent: 'space-between', paddingVertical: 4 },
    newsTitle: { fontSize: 14, fontWeight: '700', color: c.textBrown },
    newsSub: { fontSize: 12, color: c.textMuted, marginTop: 4 },
    newsLink: { fontSize: 12, fontWeight: '700', color: c.primary },
    clientCard: { width: 260, backgroundColor: c.cardBg, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.orange50, ...shadow() },
    clientHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    clientAvatar: { width: 40, height: 40, borderRadius: 20 },
    clientName: { fontSize: 14, fontWeight: '700', color: c.textBrown },
    starsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
    clientQuote: { fontSize: 12, fontStyle: 'italic', color: c.textMuted },
    partnersTitle: { textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    partnersScroll: { paddingHorizontal: 32, gap: 32, alignItems: 'center' },
    partnerItem: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.6 },
    partnerText: { fontWeight: '700', color: c.textMuted, fontSize: 16 },
  });
});
