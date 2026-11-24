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
| V3.9.0 | Karma havuzlarda doğrudan NFT'ler için toplu Unstake seçicisi. Yeni Polygon ERC-1155 adaptörü, bir koleksiyonda 16 farklı NFT kimliğinin seçilen miktarlarını tek işlemde çıkarır. |
| V3.10.0 | Start now. Havuz başlangıcı, oluşturma işleminin blok saatinden alınır. Studio ayrıca 15 dakika, 1 saat, 24 saat ve özel tarih seçeneklerini sunar. |

V3.0–V3.10 arası on bir ana teslim vardır. V3.5 ve V3.6 altındaki altı yama etiketi ayrı canlı kontrat adresleri anlamına gelmez. Sürümlerin zincir üzerinde kullanılabilirliği aşağıdaki dağıtım kaydıyla belirlenir.

## Yerel test dağıtımları

| Ortam | Sürüm | Durum |
| --- | --- | --- |
| CoinCollect yerel test ağı, `31337` | V3.10.0-rc | Studio'nun aktif dağıtımı. Ledger `0x4b000724210A4E1B98792c5Ba375465B890feF00`, Treasury `0x6bB33e86947570EA4C02E4397b92914cb69f7109`, ERC-1155 adaptörü `0x7806403712FfeC18a543ab8794d482Aa122f78E3`. |
| CoinCollect yerel test ağı, `31337` | V3.9.0-rc | Önceki dağıtım. Beş havuz ve Treasury kayıtları kendi kontratlarında korunuyor. Ledger `0x1e1C00c721e8b634E2388A0B8bB9BcCcf5B58259`, Treasury `0x85645e9cb03a6E4c8Fe179FdF33d45A4D8738758`, ERC-1155 adaptörü `0x68D3DdC245a9cC57F054fe73965586FCc1378FEb`. |
| CoinCollect yerel test ağı, `31337` | V3.7.0 Direct Treasury | Ledger `0x8559bb75c406c85af322085576a1907abb0f61f8`. Üç eski havuz ve Treasury kayıtları bu kontratta duruyor. |
| Sürüm paketi | V3.8.0-rc | Ana kontrat `UniversalRewardsV38` ilk kez V3.9.0-rc paketiyle yerel test ağına dağıtıldı. |

V3.7.0 çalışma kodu hash'i `0x2ca9ed079db8a5a8dfd74d1c0b8780913cee1a3d56912c61655b211c8e2d152f`. Yeniden derlenen V3.7.0 paketi, zincirdeki kütüphane adresleri ve immutable alanlar hesaba katılarak blok 261'de karşılaştırıldı.

Önceden yazılmış V3.3 toplu işlem denemesi sürüm hattına alınmamıştı. V3.8, bu davranışın Direct Treasury tabanındaki numaralı teslimidir. Studio ortam başına tek bir ledger okur. V3.10.0-rc ile Studio, aynı zincire eklenen yeni ledger ve Treasury'yi kullanıyor. V3.7 ve V3.9 adresleri, havuz pozisyonları ve Treasury bakiyeleri kendi kontratlarında korunuyor.

### V3.8.0-rc derleme ve kabul testi

Kontrat projesinin `projects/universal-rewards-v3` dizininde çalışır. Derleme, derleyici girdisini, ABI ve bytecode dosyalarını ve manifesti belirtilen dizine yazar. Kabul testi otomatik fixture kullanır ve paylaşılan test RPC'sine işlem göndermez.

```sh
node scripts/build-release.cjs /tmp/coincollect-v380 3.8.0-rc
node --test test/direct-treasury-v37.test.cjs
```

Test her iki sürümde Direct Treasury fonlamasını, ayrıca V3.8'de 32 NFT ile üç ödül tokenının tek işlemde ödenmesini ve geçersiz bir pozisyon içeren toplu Unstake'in geri alınmasını doğrular.

V3.8.0-rc `standard-input.json` SHA-256 değeri `6c79b0e27c1abaa4ef53b9b8b93998d4841a3acf23a9132460d3f78b6779ec98`. Derlenen V3.8.0 ledger çalışma kodu 24.389 bayttır.

### 24 Kasım 2026 test hazırlığı

V3.8.0-rc, V3.7.0'ın 63 kontrat fonksiyonunu koruyor. Treasury Vault, varlık kaydı ve rota planlayıcısının derlenen çalışma kodları eşleşiyor. Pool Studio'nun 22 NFT ve sekiz ekosistem tokenı kataloğu, varsayılan Power değerleri, görseller ve Community / Partner sunumu uygulama kodunda ortak kullanılıyor.

- Korunan V3.7 test zincirinde USDT, COLLECT ve AVATAR için doğrudan Treasury rezervi, USDT bütçeli Treasury ve cüzdan bütçeli havuz açılışı zincire işlem yazılmadan simüle edildi. USDT → COLLECT ve USDT → AVATAR için onaylı rotadan fiyat alındı.
- Treasury'ye native POL yatırma, USDT çekme ve Treasury içinden USDT → COLLECT swap işlemleri aynı blokta başarıyla simüle edildi.
- Treasury'de 13 varlık görüldü. Dört test cüzdanının her birinde 22 koleksiyonun her birinden 500 NFT doğrulandı. Havuz oluşturma simülasyonunda 21 koleksiyon doğrudan kabul edildi. Aavegotchi mevcut uyumluluk kontrolünde reddedildi.
- V3.8 toplu Unstake, doğrudan stake edilen NFT pozisyonlarını kapsıyor. Yönetilen ERC-1155 pozisyonları mevcut adet bazlı çıkış akışını kullanıyor.
- V3.7 havuz ve Treasury kayıtlarına erişimi koruyan sürüm seçimi henüz ortak Studio'da yok. Bir V3.8 ledger dağıtımı yapılsa bile V3.7 Treasury kayıtları ve havuz pozisyonları yeni kontrata kendiliğinden taşınmaz.

### V3.9.0-rc karma havuz kabulü

Karma havuzda FarmCard'ın Unstake düğmesi doğrudan stake edilen NFT'leri seçer. Yönetilen koleksiyonların çıkışı aynı penceredeki ERC-1155 bağlantısından açılır. V3.9 adaptörü miktarları tek işlemde çıkarır ve birikmiş ödülleri aynı cüzdanın Harvest işlemine hazırlar. Tek işlem bir adaptöre ve bir koleksiyona uygulanır. Önceki adaptörler mevcut tekli çıkışlarını kullanır. Aavegotchi kapsam dışıdır.

```sh
node scripts/build-release.cjs /tmp/coincollect-v390 3.9.0-rc
node --test test/managed-batch-v39.test.cjs
```

V3.9.0-rc derleyici girdisi SHA-256 değeri `a474b2c2896564bbb1d3edc23960e3069300ca22dd92e3f76d4d73f5e73312ad`. Paket `coincollect-universal-rewards-v3.9.0-rc.tar.gz` olarak üretildi. Ana kontrat `VERSION()` ile `3.8.0`, ERC-1155 adaptörü `3.9.0` döndürür.

24 Kasım 2026'da aynı korunan RPC üzerinden ledger, Treasury ve adaptör sırasıyla 268, 269 ve 271. bloklarda dağıtıldı. Zincirdeki ledger çalışma kodu hash'i `0xb44abee3cde29e91a6e8bff1fc87ce7773d7852896dfd3fe3c4fb5a90f11b218`, ERC-1155 adaptörünün hash'i `0x6d2e0f7a5e274d3bd058861507a4e9ac558a7f9afc712bbb4eaff25cd0b6d873`. Studio adresi yerel geliştirmede `~/.config/coincollect/studio-deployment.json` dosyasından, korunan ağın RPC ve checkpoint eşleşmesine bağlı olarak yükleniyor.

Yeni Treasury test fonlarıyla açıldı. 287. blokta oluşturulan 1 numaralı havuz için `1 USDT`, `15 COLLECT` ve `5 AVATAR` doğrudan ayrıldı. Tarayıcıda Studio, 13 varlıklı Treasury ve havuz detay sayfası yeni kontrat adresleriyle doğrulandı. Aynı zincirde 291–294. bloklarda iki NFT'nin üç tokenlı toplu Harvest'ı, iki ERC-721'in toplu Unstake'i, iki ERC-1155 kimliğinin toplu çıkışı ve çıkış sonrası ödül Harvest'ı onaylandı. Bu işlemler yerel test hesabıyla yapıldı. Kullanıcının MetaMask onayıyla manuel kabul sıradaki adımdır.

### Uygulama 2.5.1 · Stake modalı

V3 FarmCard'daki Stake ve Stake More, havuz listesinde ve havuz detayında aynı NFT seçim modalını açar. ERC-721 galerisi uygun koleksiyonları tek ekranda gruplar. Büyük koleksiyonlar önizlemeyle açılır ve bağımsız genişler. Filtreler ve seçim görünümü ortak NFT seçimini korur. Alttaki sabit özet seçilen NFT sayısını, toplam Power'ı ve boş yerleri gösterir. ERC-1155 adet girişi ilgili koleksiyonun altında açılır.

V3 FarmCard, cüzdanın stake ettiği NFT sayısını ve havuzun cüzdan başına limitini `3/3 NFT` biçiminde gösterir. Liste ve detay kartı masaüstü Chromium'da, detay kartı ayrıca 360 px mobil görünümde doğrulandı.

### V3.10.0-rc · Havuz oluşturulduğunda başlatma

Start now seçildiğinde Studio `start = 0` ve `end = süre` gönderir. Ledger başlangıç ve bitişi oluşturma bloğundan hesaplayıp mutlak zamanlar olarak saklar. Treasury rezervi ve cüzdan bütçesi planı kurulum sırasında tanımlanabilir. Cüzdan bütçesinin yatırılması mevcut ayrı işlemle yapılır. Önceden tarih verilen havuzlar mutlak zamanları kullanır.

V3.10.0-rc derleyici girdisi SHA-256 değeri `bf0053a06db21544d75744dfa654dc9277bb7fbec4c8799739ad227e34bee3ce`. Ana kontrat çalışma kodu 24.538 bayttır. `test/instant-start-v310.test.cjs`, üç Studio fonlama yolunda havuzun aynı blokta stake kabul ettiğini ve ileri tarihli havuzların başlangıç tarihine uyduğunu doğruladı.

24 Kasım 2026'da aynı RPC üzerinden ledger, Treasury ve adaptör sırasıyla 322, 323 ve 325. bloklarda dağıtıldı. Ledger çalışma kodu hash'i `0xd29e49393de68bb02b0c3f7f038d9989defb467ab5dd05fb6c0b76d584e990bd`, Treasury hash'i `0x4bf5df3d6887e91b91a0619f5356d5e9056e1e2d75b74bf6b855fe585f4ff863`, adaptör hash'i `0x87bb26bca663872682403c29e0f8777ef933c9a6551b430ffe26d3bf36b82e46`.

Studio'da Start now varsayılanıyla oluşturulan `V3.10 Start Now` havuzu 338. blokta açıldı. Doğrudan Treasury'den 0,25 USDT, 10 COLLECT ve 2 AVATAR ayrıldı. `joinBatch` 338. blok verisiyle başarılı oldu. Tarayıcıdan iki ERC-721 için gönderilen stake işlemi 339. blokta onaylandı. V3.9'daki beş havuzun kuralları, pozisyonları ve 13 varlıklı Treasury kayıtları işlemden önce ve sonra eşleşti.

FAROZ (#2) üzerinde 353–355. bloklarda 23 ve 15 Power ile iki cüzdanın ödül paylaşımı doğrulandı. İkinci cüzdan iki NFT'yi tek işlemde çıkardı ve birikmiş COLLECT, LOT ve USDT ödüllerini aldı. Kalan cüzdanın payı 23/38'den %100'e çıktı. Eşit 24 saniyelik aralıklarda COLLECT ve LOT birikim hızı yaklaşık %65,2 arttı. USDT tutarları tokenın en küçük birimine yuvarlandı ve hesapla eşleşti.

## Bundan sonraki sürümler

- Zincir üstü davranışa yeni özellik eklenince yeni bir minor sürüm, hata düzeltildiğinde yeni bir patch sürüm hazırlanır. Yalnızca arayüzü etkileyen değişiklikler uygulama sürümünde kaydedilir.
- Her sürümün değişiklik özeti, önceki sürümle uyumu, derleme manifesti ve kabul testi sonucu bu kayda eklenir. Dağıtımdan sonra zincir kimliği, kontrat adresi ve çalışma kodunun hash'i de kaydedilir.
- Aday, ortak testte aktif ve üretimde aktif durumları ayrı yazılır. Mevcut havuzlar kendi kontratlarında kalır.

Önceki kayıtlar [V3 çalışma kılavuzu](universal-rewards-v3.md), [V3.6 Treasury](universal-rewards-v36-treasury.md) ve [V3.6.2 kabul kaydı](universal-rewards-v362-acceptance.md) içinde yer alır.
