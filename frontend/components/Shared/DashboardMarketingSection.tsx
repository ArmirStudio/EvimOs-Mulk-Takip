import React from 'react';
import {
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import type { AdCampaign } from '@shared/campaign';
import { createThemedStyles, useAppTheme } from '../../app/theme';
import { tr } from '../../app/translations';

export type { AdCampaign } from '@shared/campaign';

interface Props {
  campaigns: AdCampaign[];
  onCampaignEvent?: (
    campaign: AdCampaign,
    eventType: 'click' | 'link_open',
    placement: string
  ) => Promise<void> | void;
}

const shadow = (color = '#000', opacity = 0.05, radius = 4, elevation = 2) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation,
});

async function openCampaignLink(
  campaign: AdCampaign,
  placement: string,
  onCampaignEvent?: Props['onCampaignEvent']
) {
  const url = campaign.link_url;
  if (!url) return;

  try {
    await onCampaignEvent?.(campaign, 'click', placement);
  } catch {
    // Analytics must not block the user's navigation.
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      try {
        await onCampaignEvent?.(campaign, 'link_open', placement);
      } catch {
        // Analytics must not block the user's navigation.
      }
      await Linking.openURL(url);
      return;
    }
    console.warn('Cannot open URL:', url);
  } catch (error) {
    console.error('Error opening URL:', error);
  }
}

export function SponsoredProjectsStrip({ campaigns, onCampaignEvent }: Props) {
  const theme = useAppTheme();
  const s = useStyles();
  const c = theme.colors.stitch;
  const inlineAds = campaigns.filter((item) => item.type === 'inline_ad');

  if (inlineAds.length === 0) return null;

  return (
    <View style={s.compactSection}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{tr.agent.sponsoredProjects}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScrollCompact}>
        {inlineAds.map((ad) => (
          <TouchableOpacity
            key={ad.id}
            style={s.compactProjectCard}
            onPress={() => openCampaignLink(ad, 'sponsored_strip', onCampaignEvent)}
            activeOpacity={ad.link_url ? 0.75 : 1}
          >
            {ad.image_url ? (
              <ImageBackground source={{ uri: ad.image_url }} style={s.compactProjectImg} />
            ) : (
              <View style={[s.compactProjectImg, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={24} color={c.textMuted} />
              </View>
            )}
            <View style={s.compactProjectInfo}>
              <Text style={s.compactProjectTitle} numberOfLines={1}>{ad.title}</Text>
              {ad.body ? <Text style={s.compactProjectSub} numberOfLines={2}>{ad.body}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function RealEstateNewsRail({ campaigns, onCampaignEvent }: Props) {
  const theme = useAppTheme();
  const s = useStyles();
  const c = theme.colors.stitch;
  const news = campaigns.filter((item) => item.type === 'news');

  if (news.length === 0) return null;

  return (
    <View style={s.newsRailSection}>
      <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>{tr.agent.news}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
        {news.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={s.newsRailCard}
            onPress={() => openCampaignLink(item, 'news_rail', onCampaignEvent)}
            activeOpacity={item.link_url ? 0.75 : 1}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={s.newsRailImg} />
            ) : (
              <View style={[s.newsRailImg, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="newspaper-outline" size={22} color={c.textMuted} />
              </View>
            )}
            <View style={s.newsRailContent}>
              <Text style={s.newsTitle} numberOfLines={1}>{item.title}</Text>
              {item.body ? <Text style={s.newsSub} numberOfLines={2}>{item.body}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export function MarketingTrustSections({ campaigns, onCampaignEvent }: Props) {
  const theme = useAppTheme();
  const s = useStyles();
  const c = theme.colors.stitch;
  const testimonials = campaigns.filter((item) => item.type === 'testimonial');
  const services = campaigns.filter((item) => item.type === 'service');

  return (
    <>
      {testimonials.length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionTitle, { paddingHorizontal: 16, marginBottom: 12 }]}>
            {tr.content.happyClients}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {testimonials.map((item) => (
              <View key={item.id} style={s.clientCard}>
                <View style={s.clientHeader}>
                  {item.client_avatar ? (
                    <Image source={{ uri: item.client_avatar }} style={s.clientAvatar} />
                  ) : (
                    <View style={[s.clientAvatar, { backgroundColor: c.orange50, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontWeight: '700', color: c.primary }}>
                        {(item.client_name || item.title || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={s.clientName}>{item.client_name || item.title}</Text>
                    <View style={s.starsRow}>
                      {Array.from({ length: Math.floor(item.client_rating || 5) }).map((_, index) => (
                        <MaterialIcons key={index} name="star" size={12} color={c.orange400} />
                      ))}
                      {(item.client_rating || 5) % 1 >= 0.5 && (
                        <MaterialIcons name="star-half" size={12} color={c.orange400} />
                      )}
                    </View>
                  </View>
                </View>
                {item.body && <Text style={s.clientQuote}>&quot;{item.body}&quot;</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {services.length > 0 && (
        <View style={{ paddingBottom: 32 }}>
          <Text style={s.partnersTitle}>{tr.agent.partners}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.partnersScroll}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={s.partnerItem}
                onPress={() => openCampaignLink(service, 'partner_service', onCampaignEvent)}
                activeOpacity={service.link_url ? 0.75 : 1}
              >
                {service.service_icon ? (
                  <MaterialIcons name={service.service_icon as any} size={24} color={c.textMuted} />
                ) : (
                  <Ionicons name="business-outline" size={24} color={c.textMuted} />
                )}
                <Text style={s.partnerText}>{service.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

export default function DashboardMarketingSection({ campaigns, onCampaignEvent }: Props) {
  const hasCampaigns = campaigns.some((item) =>
    item.type === 'inline_ad' || item.type === 'news' || item.type === 'testimonial' || item.type === 'service'
  );
  if (!hasCampaigns) return null;
  return (
    <>
      <SponsoredProjectsStrip campaigns={campaigns} onCampaignEvent={onCampaignEvent} />
      <RealEstateNewsRail campaigns={campaigns} onCampaignEvent={onCampaignEvent} />
      <MarketingTrustSections campaigns={campaigns} onCampaignEvent={onCampaignEvent} />
    </>
  );
}

const useStyles = createThemedStyles((theme) => {
  const c = theme.colors.stitch;
  return StyleSheet.create({
    section: { marginBottom: 24 },
    compactSection: { marginBottom: 18 },
    newsRailSection: { marginTop: 4, marginBottom: 18 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: c.textBrown },
    hScroll: { paddingHorizontal: 16, gap: 12 },
    hScrollCompact: { paddingHorizontal: 16, gap: 10 },
    compactProjectCard: { width: 236, minHeight: 108, flexDirection: 'row', backgroundColor: c.cardBg, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: c.orange50, ...shadow() },
    compactProjectImg: { width: 92, height: '100%', minHeight: 108, backgroundColor: theme.colors.surface2 },
    compactProjectInfo: { flex: 1, minWidth: 0, padding: 12, justifyContent: 'center' },
    compactProjectTitle: { fontSize: 14, fontWeight: '800', color: c.textBrown, marginBottom: 4 },
    compactProjectSub: { fontSize: 12, lineHeight: 16, color: c.textMuted },
    newsRailCard: { width: 268, minHeight: 92, flexDirection: 'row', backgroundColor: c.cardBg, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: c.orange50, gap: 10, ...shadow() },
    newsRailImg: { width: 72, height: 72, borderRadius: 10, backgroundColor: theme.colors.surface2 },
    newsRailContent: { flex: 1, minWidth: 0, justifyContent: 'center' },
    newsTitle: { fontSize: 14, fontWeight: '700', color: c.textBrown },
    newsSub: { fontSize: 12, color: c.textMuted, marginTop: 4, lineHeight: 16 },
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
