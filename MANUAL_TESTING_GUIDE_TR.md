# CoinCollect V3.5.4 manuel test rehberi

## 1. Ayrı bir test oturumu aç

Bu kurulum yeni bir Anvil zinciri, yeni test cüzdanları ve yeni havuzlar açar. Mevcut 3017 oturumunun verilerini kullanmaz. Her yeniden başlatmada yeni RPC portu ve test hesapları oluşur. Tarayıcıda gerçek varlıklarını içermeyen ayrı bir profil kullan.

Gerekenler Git, Node 22, Corepack ve masaüstü Chrome ile MetaMask. Aşağıdaki komutları `coincollect-frontend` klasöründe çalıştır. Kontrat reposunun kardeş dizinde olduğunu varsayar.

```sh
git switch pool-management
git pull --ff-only origin pool-management
node --version
corepack yarn install --frozen-lockfile

verified_contracts="$(mktemp -d)/coincollect-smart-contracts"
git -C ../coincollect-smart-contracts fetch origin pool-management
git -C ../coincollect-smart-contracts worktree add --detach "$verified_contracts" \
  bf79d05369b50b7da399f8efabf7a6d11e4c6f0a
(
  cd "$verified_contracts/projects/universal-rewards-v3"
  npm ci --workspaces=false --ignore-scripts
)
node scripts/run-v3-manual.cjs "$verified_contracts/projects/universal-rewards-v3" 3020
```

`node --version` 22 göstermeli. Yanlış Node veya Next çalıştıran bir terminali düzeltmek için NVM kullanıyorsan önce `nvm use` çalıştır, sonra yukarıdaki kurulumu tekrar et. `--webpack` Next.js 16 komut satırı seçeneğidir. 3020 doluysa son argümanda boş bir port seç.

Terminalde üç adres açılır.

| Sayfa | Varsayılan adres |
| --- | --- |
| Pool Studio ve Treasury | <http://127.0.0.1:3020/admin/nft-pools/v3> |
| Havuz listesi | <http://127.0.0.1:3020/nftpools> |
| Hazır ERC-721 havuzu | <http://127.0.0.1:3020/nftpools/v3/1> |

MetaMask'ta ağ ekle. Terminaldeki **RPC** adresini ve zincir kimliği **31337** değerini kullan. Para simgesi **POL**. 3020 uygulama adresidir. RPC portu terminalde ayrı basılır.

Terminalde `wallets` yaz. Komut yalnızca bu oturumda rastgele üretilen iki test anahtarını ekrana gösterir. Admin ve Participant hesaplarını ayrı test profiline içe aktar. Bu anahtarları, ekran görüntülerini veya terminal geçmişini paylaşma.

| Test varlığı | Başlangıç durumu |
| --- | --- |
| Admin | Studio ve Treasury yetkili hesap. Yerel POL mevcut. |
| Participant | Fixture ERC-721 sahibi, NFT `#23`. Onaylı yönetilen ERC-1155 koleksiyonunda `#25` için 10 birim sahibi. Yerel POL mevcut. |
| Ödül ve fonlama | Yerel wrapped POL kontratı. Fixture sembolü **V3R** olarak görünebilir. Kontrat adresi terminalde. |
| Desteklenmeyen koleksiyon | Hooksuz ERC-1155 adresi terminalde. Studio bu adresi reddetmeli. |
| Havuz #1 | Hazır ERC-721 havuzu. Yerel bütçe yatırılmış. `tick` ile ödül rezervine ilk aktarımı yapabilirsin. |

Durdurmak için terminale `quit` yaz veya Ctrl+C kullan. Yeniden çalıştırmak ortamı temiz başlatır. MetaMask'taki eski RPC kaydını yeni portla güncelle ve yeni test hesaplarını içe aktar.

## 2. Treasury’den bir havuz oluştur

1. Admin olarak Studio'yu aç. **Treasury** → yerel WPOL/V3R varlığını seç → **Deposit native POL as WPOL** → miktar **20** → **Deposit**. MetaMask'ta işlemi onayla. Zincir onayı gelince **Available** 20 artmalı.
2. **Back to pools** → **New pool**. FarmCard önizlemesinde havuza bir ad ver. **Edit NFT collections** içinde terminaldeki ERC-721 adresini ekle. **Polygon ERC-721 · direct ownership check** yazısını kontrol et.
3. **Set funding budget** ile V3R seç ve **10** gir. Ödül varlığını da V3R seçip bütçenin %100'ünü ona ayır. Takvim editöründe **In 1 hour** ve örneğin **7 days** seç. Minimum eşik 1 ve cüzdan limiti en az 1 olsun.
4. Fonlama kaynağı **Treasury** iken **Review pool plan** aç. Bütçe, dağılım ve kaynak doğruysa **Create pool and reserve 10 V3R from Treasury** ile onayla. Havuz yönetim ekranında rezervasyon, Treasury'de **Available −10 / Allocated +10** görülmeli. MetaMask'ta bu adımın ücretini yerel POL ödersin.
5. Treasury'de **Withdraw available** ile 1 çek. **Available** düşerken havuza ayrılmış tutar korunmalı.
6. Oluşan ID'yi not et. Terminalde `advance 3660` yaz, sayfayı yenile ve havuzun aktif olduğunu kontrol et. Hazır havuz ve ikinci havuz aynı NFT'yi farklı kurallarla kabul edebilir. Her havuzun bütçe ve katılım kaydını kendi kartından kontrol et.

## 3. ERC-721 Join, Harvest ve Unstake

1. **Participant** hesabına geç. Hazır havuz #1'i veya kendi ERC-721 havuzunu aç.
2. Terminalde `tick` yaz. **confirmed** aldığında Studio'da ödül envanterini kontrol et. Uygun NFT kartından **Stake** ile `#23` seç. Cüzdan işlemi ve uygulama onayı tamamlanınca katılım sayısı 1 olmalı. NFT mülkiyeti Participant hesabında kalmalı.
3. `advance 120` ile yerel zincir saatini ilerlet ve sayfayı yenile. Kazanç tahmini ile zincirden doğrulanmış durumun nasıl gösterildiğini kontrol et.
4. **Harvest** ve varsa her cüzdan isteğini onayla. Aynı pozisyonun uygun ödül tokenları tek pozisyon çağrısında ödenir. Birden fazla NFT pozisyonu, dondurulmuş sürümde birden fazla onay isteyebilir. Ödül tokenını izlemek için terminaldeki V3R adresini MetaMask'a ekleyebilirsin.
5. **Unstake** ile çıkarmak istediğin NFT'yi seç. Mümkünse bir süre daha biriktikten sonra işlemi yap. Onaydan sonra sadece seçilen pozisyon kapanmalı ve ödenebilir ödülü cüzdana gitmeli.

## 4. Yönetilen ERC-1155 ve kısmi transfer

1. Admin hesabıyla yeni bir Treasury havuzu oluştur. Koleksiyon editörüne terminaldeki **Managed ERC-1155** koleksiyon adresini gir. Studio bağlı adaptörü doğrulamalı. **Unsupported ERC-1155 fixture** adresini ayrı denemede ekle. Açık bir uyumsuzluk hatası beklenir.
2. Teste uygun bir bütçe ayır ve havuz açıldıktan sonra `tick` çalıştır. Studio'da ERC-1155 birim limitini en az **6** yap.
3. Participant ile havuzu aç. Token ID **25** → **Check NFT** → miktar **6** → **Join with quantity**. Arayüz 10 sahip olunan, 6 katılan birim göstermeli.
4. `advance 120`, ardından terminalde `transfer1155 2` çalıştır. Komut Participant'tan Admin hesabına **2 birim** gönderir ve yerel işlem hash'ini gösterir. Participant'ta 8 sahip olunan, 4 katılan; Admin'de 2 sahip olunan, 2 katılan birim beklenir.
5. Admin hesabıyla aynı havuzda **Exit quantity and release rewards** üzerinden **1** birim çıkar. 1 birim katılım kalmalı. **Released rewards** ve **Harvest** durumlarını kontrol et.

## 5. Otomasyon, süre sonu ve iade

- `tick`, yerel worker'ı bir kez çalıştırır. Başarı çıktısındaki havuz ID, epoch ve hash'i Studio'daki ödül envanteriyle karşılaştır. Aynı pencere içinde ikinci `tick` ile aynı lane için ikinci alım görülmemeli. Hazır web fixture'ı fonlama ve ödül için aynı yerel tokenı kullanır. Gerçek rota davranışını görmek için aşağıdaki pinned fork komutunu ayrı terminalde çalıştır. Gerçek Polygon DEX kodunu okur, işlemleri yalnızca 31337 fork'una yazar.

```sh
(
  cd "$verified_contracts/projects/universal-rewards-v3"
  COINCOLLECT_V34_FIXTURE=1 npm run test:polygon-fork
)
```

- Deneme havuzunda ödülü olan bir pozisyon bırak. `pool-time 1 end` ile havuz #1'i bitir. Kendi havuzun için 1 yerine onun ID'sini gir. Katılım kapanmalı ve süre sayacı görünmeli. Uç noktadan bir saniye öncesini görmek için `pool-time 1 before` kullan. Bu komut bir blok üretir. Cüzdan onayıyla gönderilen bir sonraki blok kapanışa denk gelebilir.
- `pool-time 1 deadline` ile tam **end + 30 gün** bloğunu oluştur. Kartta **Claim period ended** görülmeli, Harvest kapanmalı. `tick` ile Treasury kurtarma çıktısını ve iadeyi kontrol et. Tekrar `tick` ikinci iade üretmemeli. Zincir zamanı ileri gider. Daha erken bir örneği tekrarlamak için yeni fixture aç.

## 6. Test panosu

| Alan | Durum | Kurucu kontrolü |
| --- | --- | --- |
| Treasury, havuz açma, ERC-721, yönetilen ERC-1155, Harvest, Unstake ve süre sonu | İzole Chrome ve kontrat testleri geçti | MetaMask'ta ağ, istenen işlem, ücret ve son bakiye |
| Cüzdan reddi, yanlış ağ, yeniden yüklemede bağlantı | İzole Chrome'da emüle edilmiş provider ile geçti | Ayrı Chrome profilinde fiziksel MetaMask ve Uniswap cüzdanlarını sırayla test et. Aynı anda iki eklentiyle bağlantı seçimini ayrıca kontrol et. |
| V2 NFT pools, Swap, Liquidity, NFT Marketplace ve profil | V2 yazma döngüsü ayrı izole fork'ta; diğer sayfalar Chrome'da açıldı | Swap ve Add Liquidity token araması, NFT profil ve menü navigasyonu. Tam V2 yazma provası için gerçek veriyi fork eden regresyon testini kullan. |
| Çoklu NFT için tek onay | Deneysel 31337 kontratında ayrı özellik | Standart rehber sürümünde birden fazla onay beklentisini test et. |
| Canlı DEX rotaları ve gerçek fonlar | Üretim onayı bekliyor | Manüel testleri yalnızca 31337'de yap. |
| Bağımsız güvenlik denetimi | Bekliyor | Bulguları release commit'leriyle birlikte raporla. |

**Masaüstü.** Bağlan ve yenile. MetaMask'ta bir işlemi reddet, pozisyon sayısının değişmediğini gör ve tekrar dene. Farklı bir ağ seç. Studio veya NFT kartı işlem yerine **Switch network** istemeli. Cüzdanı değiştirirken eski adresin bakiyesi ve seçili NFT'leri ekranda kalmamalı. Tab ile butonlara ulaş, modalı Esc ile kapat ve odağın açan düğmeye dönmesini kontrol et.

**Mobil.** Chrome cihaz emülasyonunda 390 × 844 ile başla. Açık ve koyu temayı, uzun ödül sayılarının taşmasını, modal kapanışını, Studio tablosunun kaymasını ve yatay sayfa taşmasını kontrol et. Telefonda loopback farklı bir cihazı ifade eder. Gerçek telefon bağlantısı için ayrıca güvenli bir yerel test bağlantısı gerekir.

**Hata raporu**

```text
Commit ve sayfanın adresi:
Cihaz, ekran boyutu, tarayıcı, cüzdan ve tema:
Ağ (31337), havuz ID ve işlem hash'i:
Adımlar:
Beklenen:
Görülen:
Görsel veya kısa video:
```
