# Universal Rewards V3.6 Treasury

Pool Studio detects the registered V3.6 Treasury from the configured ledger. The preceding Treasury remains visible with its existing operations when the configured ledger is V3.5.4. V3.6 adds reviewed assets, independent permissions, available-only swaps, native POL withdrawal and confirmed event history. Polygon and test chain 31337 share the same transaction and receipt validation.

## Izole manuel test

[V3.5.4 manuel rehberindeki](../MANUAL_TESTING_GUIDE_TR.md) Node 22 ve ayrı test cüzdanı kurulumunu kullan. Solidity projesi için V3.6 kontrat commit’i `4bed29f981b005ecdb10ee9933d9719e397555e5` sürümünü temiz bir worktree'de aç ve o projenin dizininde `npm ci --workspaces=false --ignore-scripts` çalıştır.

```sh
COINCOLLECT_V36_FIXTURE=1 node scripts/run-v3-manual.cjs \
  /path/to/verified-contract-worktree/projects/universal-rewards-v3 3020
```

1. Terminaldeki RPC ile zincir 31337'yi MetaMask'a ekle. `wallets` ile test admin hesabını al. [Pool Studio](http://127.0.0.1:3020/admin/nft-pools/v3) → **Treasury** aç.
2. **Deposit native POL as WPOL** ile 10 yerel POL yatır. Satış için wrapped test tokenı, alış için **V3USD**, miktar olarak 1 seç. İlk teklif, TWAP gözlemleri hazır olana kadar kapalıdır.
3. Terminalde `observe36`, ardından `advance 1801` ve `observe36` çalıştır. **Get protected quote** ile rota, kur, etki, ağ ücreti ve minimum alınanı gör. **Confirm Treasury swap** sonrasında kullanılabilir bakiye ve geçmişi karşılaştır.
4. **Withdraw as native POL** ile wrapped test varlığı yerel POL olarak çek. Bu işlem Treasury'nin yalnızca kullanılabilir payını düşürür.
5. **Add or re-review a token** bölümünde terminalde basılan V3BTC adresini kontrol et. Sadece bu fixture'da örnek inceleme özeti olarak `0x` ardından 32 kez `12` gir ve probe miktarını `0.00000001` seç. Treasury yatırımı ve yeni ödül izinlerini aç. Onay ve probe başarıyla tamamlanınca V3BTC listelenir.
6. V3BTC yatır, **New pool** ile bütçe tokenı ve ödül olarak V3BTC'yi, koleksiyon olarak terminaldeki ERC-721 fixture'ını seç. Miktarı ve başlangıç saatini belirleyip Treasury'den ayır. Zincirde kullanılabilir bakiyenin düştüğünü ve ayrılan bakiyenin arttığını kontrol et.
7. **Manage token permissions** ile yeni ödül iznini kaldır. Mevcut havuzun V3BTC ödülü ve pozisyon hakları korunur. V3BTC sonraki havuzların ödül seçiminde görünmez.

Gerçek token kaydı, doğrulanmış kaynak kodu ve bağımsız uyumluluk incelemesi gerektirir. V3.6 doğrulamaları proxy kimliği ve bilinen slotları okuyabilir, her proxy tipini veya gelecekteki token davranışını ispatlayamaz. Örnek review hash'i sadece yerel fixture'a aittir.

## Verification

`COINCOLLECT_V36_FIXTURE=1 node scripts/run-v3-browser-acceptance.cjs <Solidity project>` builds and runs isolated production Chrome acceptance. The same command without the fixture flag exercises the frozen ledger. Run reports include the V36 owner workflow, stale quote rejection, receipt and balances, new token registration and pool funding. Unit tests verify protected quote identity/minimum and exact decimal parsing. The contract audit package contains the separately versioned standard inputs, ABI, pinned Polygon receipts, gas measurements and launch blockers.
