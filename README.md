# 🚽 Skibidi Clicker: Rivalry — v4.0

Tek amacın var: **Yilong Ma'dan daha zengin ol.**

Bir tuvalete tıklayarak başlıyorsun. Birkaç dakika sonra bir üretim hattın,
14 varlıklık bir portföyün, çalışan limit emirlerin ve seni hedef alan bir
rakibin oluyor. Sonunda ise simülasyonun kendisini kırıyorsun.

Tarayıcıda çalışır, kurulum gerektirmez, ilerlemen otomatik kaydedilir.

---

## 🎮 Oyna

**Yerel:** Depoyu indir ve `index.html` dosyasını tarayıcında aç. Kurulum,
derleme adımı ya da sunucu gerekmez — oyun hiçbir dış kaynağa bağlı olmadan
kendi kendine çalışır.

**Yayına almak için** iki hazır yol var; `netlify.toml` zaten depoda:

- **Netlify** — app.netlify.com → projeyi GitHub deposuna bağla. Her push
  otomatik yayına girer.
- **GitHub Pages** — Settings → Pages → Source: "Deploy from a branch" →
  `main` / `(root)` → Save. Ardından oyun
  `https://eymistaken.github.io/yilongma/` adresinde yayınlanır.

---

## ✨ Ne var içinde?

### Tıklama ve kombo
- Tuvalete tıkla, **Gyatt** kazan. Kritik vuruşlar katlar.
- Hızlı tıklamak **kombo** biriktirir — her yığın kazancını %1 artırır.
- Kombo tavana ulaşınca **FEVER MODE**: 8 saniye boyunca her şey **3 katı**.

### ⚙️ Üretim hattı (idle katmanı)
- Stajyer'den Gyatt Hiperküpü'ne 10 kademeli üretici. Sen tıklamasan da üretirler.
- Her **10 / 25 / 50 / 100 / 150 / 200 / 300** adette o üreticinin çıktısı ikiye katlanır.
- 1x / 10x / 100x / MAX toplu alım.
- **Çevrimdışı kazanç**: sekme kapalıyken de birikir (varsayılan %50 verim, 8 saat tavan — yetenekle artar).

### 📈 Borsa
- **14 varlık** dört sınıfta: fiat, teknoloji, kripto, metal.
- Gerçek bir fiyat modeli: uzun vadeli eğilim + boğa/ayı/yatay **rejimler** +
  ortalamaya dönüş + rastgele şoklar. Her varlığın kendi oynaklığı var.
- **Ortalama maliyet ve kâr/zarar takibi** — hem varlık kartında hem portföy panelinde.
- **Limit emirleri**: "şu fiyatın altına düşerse al", "üstüne çıkarsa sat".
  Sen başka işle uğraşırken çalışır.
- **Piyasa olayları**: Kara Perşembe, Boğa Koşusu, Kripto Kışı, Hiperenflasyon,
  Halving, Rug Pull, Short Sıkışması, Devre Kesici… Her biri uyarı bandıyla duyurulur.
- İşlem komisyonu (yetenekle düşer) ve portföy dağılım grafiği.

### 🗿 Yilong Ma — gerçek bir rakip
Artık sadece artan bir sayı değil:
- **Gerçek bir portföyü var.** Momentum stratejisiyle alıp satıyor, serveti
  elindeki varlıkların değerinden geliyor. Aldığı varlık pompalanıyor.
- **Ruh hali değişiyor**: 🤓 Kibirli → 🤨 Rahatsız → 😠 Sinirli → 😰 Çaresiz → 😭 Çökmüş.
  Avatarı, tweetleri ve saldırganlığı buna göre değişir.
- **Saldırıyor**: İptal Kültürü, Vergi Denetimi, DDoS, Hedefli Rug Pull,
  Ayı Saldırısı, Düşmanca Devralma. Her saldırı önce **uyarı bandıyla** haber
  verilir — pozisyonunu toplamak için birkaç saniyen var.

### 🔱 Sigma Yükselişi (prestij)
- Faz 2'den sonra açılır. Koşunu sıfırlar, karşılığında **Sigma Parçası** verir.
- **12 düğümlü yetenek ağacı**: tık gücü, otomasyon, kritik, komisyon, piyasa
  eğilimi, slot şansı, çevrimdışı verim, sabotaj direnci, kombo, gacha şansı ve daha fazlası.
- Yükselişte **korunanlar**: başarımlar, parçalar, yetenekler, kara borsa eşyaları, hikâye ilerlemen.

### 🏆 Başarımlar ve görevler
- **51 başarım** (gizliler dahil). Her biri tüm Gyatt kazançlarına kalıcı bonus ekler.
- Aynı anda **3 aktif görev**, tamamladıkça ölçeklenir. Beğenmediğini 🔄 ile değiştir.

### 🎰 Slot & 🏴‍☠️ Kara Borsa
- Skibidi Slots orijinal ödeme tablosuyla (🚽🚽🚽 = x500, Faz 2'de x1000).
- Faz 2'de serbest bahis ve ALL IN.
- Kara Borsa gacha kasası: kalıcı çarpanlar ve Yilong'a doğrudan sabotaj eşyaları.

### 💾 Kayıt ve ayarlar
- 15 saniyede bir otomatik kayıt, sekme kapanırken de kaydeder.
- Kaydını **dışa/içe aktar** (base64 metin) — başka tarayıcıya taşı.
- Ses seviyesi, **hareketi azalt**, partikül yoğunluğu, sayı biçimi (kısa/bilimsel),
  otomatik kayıt aralığı, FPS göstergesi, her şeyi sıfırla.

### 📖 Hikâye — dört faz
1. **Faz 1** — Yilong'un iki katı servete ulaş.
2. **Faz 2** — *Devlet Vergisi*: her şeye el konur. Kara Borsa açılır, Yilong Sigma'ya evrilir.
3. **Faz 3** — *BSOD*: sistem çöker. Üç evrenden birini seç (**The Red Rot**,
   **The Matrix**, **The Void**) ve Firewall'u yık.
4. **Faz 4** — Kırmızı hap mı, mavi hap mı? Biri jenerik, diğeri **Mimar Modu**.

### ⌨️ Kısayollar
| Tuş | İşlev |
|---|---|
| `Boşluk` | Tıkla |
| `1` `2` `3` `4` | Sol paneller (Slot / Portföy / Görev / İstatistik) |
| `Q` `W` `E` `R` | Sağ paneller (Yükseltme / Üretim / Yetenek / Kara Borsa) |
| `A` | Başarımlar |
| `S` | Ayarlar |
| `H` | Yardım |
| `M` | Sesi aç/kapat |
| `Esc` | Kapat |

---

## 🗂️ Proje yapısı

v4'te tek dosyalık `index.html` modüllere bölündü. Klasik `<script>` etiketleri
kullanılır (ES modülü değil), böylece hem GitHub Pages'te hem de `file://`
üzerinden doğrudan açıldığında çalışır — derleme adımı yok.

```
index.html              Sadece işaretleme + modül yüklemeleri
src/css/style.css       Tüm stiller
src/js/
  00-core.js            Yardımcılar, olay veri yolu, biçimlendirme
  10-content.js         VERİ TABLOLARI — denge ayarı için tek durak
  20-state.js           Durum şeması, kayıt/yükleme/göç, çevrimdışı hesabı
  25-balance.js         Türetilmiş değerler ve tüm formüller
  30-audio.js           Tone.js sarmalayıcısı
  32-fx.js              Popup, partikül, toast, uyarı bandı, ekran sarsıntısı
  34-clicker.js         Tıklama, kombo, FEVER
  36-production.js      Üreticiler ve yükseltmeler
  40-market.js          Fiyat modeli, alım/satım, limit emirleri, olaylar
  44-yilong.js          Rakip yapay zekâsı
  46-slots.js           Slot mini oyunu
  48-blackmarket.js     Gacha kasası
  50-achievements.js    Başarımlar
  52-quests.js          Görevler
  54-prestige.js        Yükseliş ve yetenek ağacı
  56-skitter.js         Haber akışı
  60-narrative.js       Faz geçişleri ve finaller
  70-ui.js              Paneller, modaller, ayarlar, kısayollar
  90-main.js            Önyükleme ve oyun döngüsü
```

**Denge ayarı yapmak istiyorsan** neredeyse her sayı `src/js/10-content.js`
içindedir: varlıklar, üreticiler, yükseltmeler, yetenekler, başarımlar,
görevler, piyasa olayları, Yilong'un ruh halleri ve saldırıları.

### Mimari notlar
- `SK.state` tek doğruluk kaynağıdır; `derived` ve `ui` alanları kaydedilmez.
- Modüller birbirini doğrudan çağırmak yerine `SK.emit` / `SK.on` kullanabilir.
- Oyun döngüsü üç ritimde çalışır: her kare (görsel), saniyede 10 (ekonomi),
  saniyede 1 (başarım/görev/rakip taramaları). Ağır işler kare hızını düşürmez.
- Kayıt şeması sürümlüdür; eksik alanlar varsayılandan tamamlanır, böylece yeni
  bir özellik eklendiğinde eski kayıtlar bozulmaz.
- Grafikler kart ilk açıldığında kurulur — 14 grafiği aynı anda kurmak açılışı yavaşlatıyordu.

---

## 💻 Teknoloji

Ön yüz, sıfır kurulum:

- HTML5 + Vanilla JavaScript (ES6+)
- Tailwind CSS (CDN) — `hidden`/`flex` için yerel yedek kuralları var
- Chart.js — piyasa grafikleri
- Tone.js — ses
- SortableJS — borsa listesini sürükle-bırak

---

## ♿ Erişilebilirlik

- **Hareketi azalt** ayarı tüm animasyonları ve partikülleri kapatır;
  sistemdeki `prefers-reduced-motion` tercihi de dikkate alınır.
- Tuvalet klavyeyle odaklanabilir (`Boşluk` / `Enter`).
- Tüm ana işlevler klavye kısayollarıyla erişilebilir.
