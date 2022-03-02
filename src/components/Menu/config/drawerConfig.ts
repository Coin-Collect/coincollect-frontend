import { MenuEntry } from "components/NewUi/widgets/Menu/types";

const drawerLinks: MenuEntry[] = [
    {
        label: 'NFTs',
        icon: 'NftIcon',
        href: '/nfts',
        initialOpenState: true,
        items: [
            {
                label: 'Marketplace',
                href: '/nfts',
            },
            {
                label: 'Collections',
                href: '/nfts/collections',
            },

        ],
    },
    {
        label: 'Yield',
        icon: 'TradeIcon',
        href: '/farms',
        initialOpenState: true,
        items: [
            {
                label: 'Farms',
                href: '/farms',
            },
            {
                label: 'Staking',
                href: '/pools',
            },

        ],
    },


];

export default drawerLinks