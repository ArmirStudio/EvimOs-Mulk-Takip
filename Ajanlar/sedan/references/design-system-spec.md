# Design System Spec

## Kullanim

Bu dosyayi token mimarisi, renk rolleri, tipografi ve komponent spec uretirken oku.

## Token Mimari Iskeleti

Sirayi bozma:
1. Primitive tokens
2. Semantic tokens
3. Component tokens

### Primitive
- color
- spacing
- radius
- size
- elevation
- duration
- easing
- typography primitives

### Semantic
- surface
- text
- icon
- border
- action
- feedback
- focus
- disabled

### Component
- button
- text-field
- card
- sheet
- nav
- banner

## Renk Rolleri

Zorunlu roller:
- `surface.background`
- `surface.primary`
- `surface.secondary`
- `surface.elevated`
- `text.primary`
- `text.secondary`
- `text.inverse`
- `border.subtle`
- `border.strong`
- `action.primary`
- `action.primary-pressed`
- `action.secondary`
- `feedback.success`
- `feedback.warning`
- `feedback.error`
- `focus.ring`

Notlar:
- Light ve dark mod icin ayni semantic isimleri koru.
- Kritik metinlerde en az AA kontrast hedefle.
- Rengi tek bilgi kanali yapma. Ikon, etiket veya metin destegi ver.

## Tipografi

Her zaman su bilgileri yaz:
- aile
- size
- line-height
- weight
- kullanildigi seviye

Asgari seviye seti:
- display
- title
- heading
- body
- body-small
- label
- caption

Notlar:
- Dynamic Type veya system font scaling davranisini belirt.
- Uzun metinlerde satir uzunlugu ve line-height kararini acikla.
- Sadece estetik degil, okunabilirlik gerekcesi ver.

## Komponent Spec Iskeleti

Her komponent icin su alanlari yaz:
- amac
- varyantlar
- boyutlar
- state'ler
- layout kurallari
- icerik kurallari
- davranis
- erisilebilirlik notlari

### Button

Zorunlu state'ler:
- default
- pressed
- focused
- disabled
- loading
- destructive

Yaz:
- min height
- horizontal padding
- icon spacing
- tam alan mi icerik kadar mi
- loading sirasinda label davranisi

### TextField

Zorunlu state'ler:
- empty
- filled
- focused
- error
- disabled
- readonly

Yaz:
- label davranisi
- helper ve error mesaji
- prefix/suffix
- input method ipuclari
- keyboard ve autofill notlari

### Card

Zorunlu state'ler:
- static
- hover veya pressed
- selected
- disabled
- loading

Yaz:
- padding
- media orani
- title/subtitle/metadata yapisi
- CTA yeri

## Erisilebilirlik Olculeri

- Dokunma hedefi: tercihen 44x44 pt veya ustu
- Focus gostergesi: yalniz renk degisikligiyle sinirli kalma
- Error state: metin + ikon + aria veya screen reader ipucu
- Reduce motion: ayni anlami opacity veya crossfade ile koru
- Dynamic font: tasma ve kesilme davranisini acikla
