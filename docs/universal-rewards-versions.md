# CoinCollect Universal Rewards sürüm kaydı

Pool Studio V3, uygulamadaki ürün ailesinin adıdır. Aşağıdaki numaralar havuzları, NFT pozisyonlarını ve ödülleri yöneten Universal Rewards kontratının ve ona eşlik eden teslimlerin geçmişini gösterir.

| Sürüm | Eklenen özellik |
| --- | --- |
| V3.0 | NFT cüzdanda kalırken katılım, Power ve birden fazla tokenla ödül dağıtımı. |
| V3.1 | Treasury Vault ve onaylı swap rotalarıyla havuz bütçesi. |
| V3.2 | Tek yönetici, ortak Treasury, havuz açılışında bütçe ayırma ve daha büyük havuzlar. |
| V3.3 | Onaylı ERC-1155 koleksiyonlarının katılımı. Base ve Arbitrum akışları izole geliştirme testlerindeydi. |
| V3.4 | NFT transfer bildirimleri, sahiplik ve ağlar arası kayıt denetimlerinin güçlendirilmesi. |
| V3.5 | Polygon sürüm adayı. V3.4 Solidity kaynakları yeniden üretilebilir bir paketle Studio ve doğrulama iyileştirmelerine bağlandı. V3.5.1–V3.5.4, araç ve doğrulama teslimleridir. |
| V3.6 | Treasury varlık kaydı, token izinleri, Treasury bakiyesinden swap ve native POL çekimi. V3.6.1 swap güvenlik kontrollerini güçlendirdi. V3.6.2, V3.6.1 kontratlarını kullanan uygulama ve kabul teslimidir. |
| V3.7.0 | Direct Treasury. Her ödül tokenının miktarı ayrı girilip mevcut Treasury bakiyesinden havuza doğrudan ayrılabilir. Tek bütçe tokenıyla swap seçeneği de kullanılabilir. |
| V3.8.0 | Direct Treasury üzerinde toplu Harvest ve doğrudan stake edilen NFT'ler için toplu Unstake & Harvest. Bir işlemde en fazla 32 NFT işlenir. Kontrat `VERSION()` ile `3.8.0` döndürür. |

V3.0–V3.8 arası dokuz ana teslim vardır. V3.5 ve V3.6 altındaki altı yama etiketi ayrı canlı kontrat adresleri anlamına gelmez. Sürümlerin zincir üzerinde kullanılabilirliği aşağıdaki dağıtım kaydıyla belirlenir.

## Aktif ortam ve test adayı

| Ortam | Sürüm | Durum |
| --- | --- | --- |
| CoinCollect yerel test ağı, `31337` | V3.7.0 Direct Treasury | Ledger `0x8559bb75c406c85af322085576a1907abb0f61f8`. Mevcut üç havuz burada. Harvest ve Unstake, NFT başına onay alır. |
| V3.8.0 test adayı | `UniversalRewardsV38` | Sürüm paketi ve otomatik kontrat kabul testleri var. Ortak test ağına dağıtım yapılmadı. |

V3.7.0 çalışma kodu hash'i `0x2ca9ed079db8a5a8dfd74d1c0b8780913cee1a3d56912c61655b211c8e2d152f`. Yeniden derlenen V3.7.0 paketi, zincirdeki kütüphane adresleri ve immutable alanlar hesaba katılarak blok 261'de karşılaştırıldı.

Önceden yazılmış V3.3 toplu işlem denemesi sürüm hattına alınmamıştı. V3.8, bu davranışın Direct Treasury tabanındaki numaralı teslimidir. Canlı V3.7 ledger'ı yerinde yükseltilemez. V3.8 için aynı ağda yeni bir ledger adresi gerekir. Studio şu anda ortam başına tek bir ledger okuduğu için varsayılan adresi doğrudan değiştirmek mevcut havuzları arayüzden kaldırır. Ortak testte V3.8'i açarken V3.7 havuzlarının ve taleplerinin erişilebilirliğini koruyacak seçim akışı gereklidir.

### V3.8.0-rc derleme ve kabul testi

Kontrat projesinin `projects/universal-rewards-v3` dizininde çalışır. Derleme, derleyici girdisini, ABI ve bytecode dosyalarını ve manifesti belirtilen dizine yazar. Kabul testi otomatik fixture kullanır ve paylaşılan test RPC'sine işlem göndermez.

```sh
node scripts/build-release.cjs /tmp/coincollect-v380 3.8.0-rc
node --test test/direct-treasury-v37.test.cjs
```

Test her iki sürümde Direct Treasury fonlamasını, ayrıca V3.8'de 32 NFT ile üç ödül tokenının tek işlemde ödenmesini ve geçersiz bir pozisyon içeren toplu Unstake'in geri alınmasını doğrular.

V3.8.0-rc `standard-input.json` SHA-256 değeri `6c79b0e27c1abaa4ef53b9b8b93998d4841a3acf23a9132460d3f78b6779ec98`. Derlenen V3.8.0 ledger çalışma kodu 24.389 bayttır. Henüz dağıtım adresi veya zincirde doğrulanmış çalışma kodu hash'i yoktur.

### 24 Kasım 2026 test hazırlığı

V3.8.0-rc, V3.7.0'ın 63 kontrat fonksiyonunu koruyor. Treasury Vault, varlık kaydı ve rota planlayıcısının derlenen çalışma kodları eşleşiyor. Pool Studio'nun 22 NFT ve sekiz ekosistem tokenı kataloğu, varsayılan Power değerleri, görseller ve Community / Partner sunumu uygulama kodunda ortak kullanılıyor.

- Korunan V3.7 test zincirinde USDT, COLLECT ve AVATAR için doğrudan Treasury rezervi, USDT bütçeli Treasury ve cüzdan bütçeli havuz açılışı zincire işlem yazılmadan simüle edildi. USDT → COLLECT ve USDT → AVATAR için onaylı rotadan fiyat alındı.
- Treasury'ye native POL yatırma, USDT çekme ve Treasury içinden USDT → COLLECT swap işlemleri aynı blokta başarıyla simüle edildi.
- Treasury'de 13 varlık görüldü. Dört test cüzdanının her birinde 22 koleksiyonun her birinden 500 NFT doğrulandı. Havuz oluşturma simülasyonunda 21 koleksiyon doğrudan kabul edildi. Aavegotchi mevcut uyumluluk kontrolünde reddedildi.
- V3.8 toplu Unstake, doğrudan stake edilen NFT pozisyonlarını kapsıyor. Yönetilen ERC-1155 pozisyonları mevcut adet bazlı çıkış akışını kullanıyor.
- V3.7 havuz ve Treasury kayıtlarına erişimi koruyan sürüm seçimi henüz ortak Studio'da yok. Bir V3.8 ledger dağıtımı yapılsa bile V3.7 Treasury kayıtları ve havuz pozisyonları yeni kontrata kendiliğinden taşınmaz.

## Bundan sonraki sürümler

- Zincir üstü davranışa yeni özellik eklenince yeni bir minor sürüm, hata düzeltildiğinde yeni bir patch sürüm hazırlanır. Yalnızca arayüzü etkileyen değişiklikler uygulama sürümünde kaydedilir.
- Her sürümün değişiklik özeti, önceki sürümle uyumu, derleme manifesti ve kabul testi sonucu bu kayda eklenir. Dağıtımdan sonra zincir kimliği, kontrat adresi ve çalışma kodunun hash'i de kaydedilir.
- Aday, ortak testte aktif ve üretimde aktif durumları ayrı yazılır. Mevcut havuzlar kendi kontratlarında kalır.

Önceki kayıtlar [V3 çalışma kılavuzu](universal-rewards-v3.md), [V3.6 Treasury](universal-rewards-v36-treasury.md) ve [V3.6.2 kabul kaydı](universal-rewards-v362-acceptance.md) içinde yer alır.
