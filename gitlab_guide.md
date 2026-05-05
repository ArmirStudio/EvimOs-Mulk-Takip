# GitLab Kullanım Rehberi (Çift Bilgisayar Senaryosu)

Bu rehber, sabah ve akşam farklı bilgisayarlarda çalışırken kodlarınızı GitLab üzerinden nasıl güncel tutacağınızı anlatır.

## 1. İlk Kurulum (Yeni Bilgisayar)
Eğer çalıştığınız bilgisayarda proje henüz yoksa, projeyi indirmeniz gerekir:

```bash
git clone https://gitlab.com/mifxcup-group/emlak-main-1.git
```
Bu komut, projenin bir kopyasını bilgisayarınıza indirir.

---

## 2. Günlük Çalışma Döngüsü

### Sabah (1. Bilgisayar) İşe Başlarken:
Derse veya işe başlamadan önce mutlaka en güncel sürümü çekin:
```bash
git pull origin master
```

### Akşam (veya İş Bittiğinde) Kodları Gönderme:
Çalışmanız bittiğinde kodları GitLab'a yüklemelisiniz ki diğer bilgisayarda kaldığınız yerden devam edebilesiniz:

1. **Değişiklikleri Hazırla:**
   ```bash
   git add .
   ```
2. **Paketle (Commit):** (Yaptığınız işi özetleyen bir mesaj yazın)
   ```bash
   git commit -m "Bugünkü geliştirmeler tamamlandı"
   ```
3. **Yükle (Push):**
   ```bash
   git push origin master
   ```

---

## 3. Akşam (2. Bilgisayar) İşe Başlarken
Evinizdeki veya akşam kullandığınız bilgisayarı açtığınızda, sabah yaptığınız değişiklikleri almak için:
```bash
git pull origin master
```
Artık sabah kaldığınız yerden devam edebilirsiniz!

---

## Önemli İpuçları 💡
- **Unutmayın:** Bir bilgisayardan kalkmadan önce mutlaka `push` yapın. Eğer `push` yapmayı unutursanız, diğer bilgisayarda en son halini göremezsiniz.
- **Hata Alırsanız:** Eğer `git pull` yaparken hata alırsanız, bilgisayarınızda henüz kaydetmediğiniz (commit yapmadığınız) değişiklikler olabilir. Önce `commit` yapın, sonra `pull` yapın.
- **Master vs Main:** Projenize göre ana dalın adı `master` veya `main` olabilir. Sizin projenizde şu an `master` kullanılıyor.

> [!IMPORTANT]
> Her zaman çalışmaya başlamadan önce `pull`, çalışmanızı bitirince `push` yapmayı alışkanlık haline getirin.
