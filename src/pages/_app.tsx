import { createNetworkConfig, IotaClientProvider, WalletProvider } from '@iota/dapp-kit'
import { getFullnodeUrl } from '@iota/iota-sdk/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AppProps } from 'next/app'
import Head from 'next/head'

import Layout from '~/components/layout'
import { useTranslation } from '~/lib/i18n'

import '@iota/dapp-kit/dist/index.css'
import '@fontsource-variable/inter'
import '~/styles/globals.css'
import '~/styles/PixelGame.module.css'

const WEB_URL = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
const FEATURED_IMAGE_PATH = '/featured-image.jpg' // TODO: Add featured image

const queryClient = new QueryClient()

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  localnet: { url: getFullnodeUrl('localnet') },
  testnet: { url: getFullnodeUrl('testnet') },
})

function App({ Component, pageProps }: AppProps) {
  const { t } = useTranslation('meta')

  const imageURL = new URL(FEATURED_IMAGE_PATH, WEB_URL).href

  return (
    <QueryClientProvider client={queryClient}>
      <IotaClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <Head>
            <title>REBASED PIXELS</title>
            <meta name="description" content="Draw pixels on the IOTA Rebased testnet" />

            <meta property="og:image" content={imageURL} key="ogImage" />
            <meta property="twitter:image" content={imageURL} key="twitterCardImage" />

            <meta property="og:type" content="website" key="ogType" />
            <meta property="og:title" content="REBASED PIXELS" key="ogTitle" />
            <meta property="og:description" content="Draw pixels on the IOTA Rebased testnet" key="ogDescription" />

            <meta property="twitter:card" content="summary_large_image" key="twitterCardSummary" />
            <meta property="twitter:title" content="REBASED PIXELS" key="twitterCardTitle" />
            <meta
              property="twitter:description"
              content="Draw pixels on the IOTA Rebased testnet"
              key="twitterCardDescription"
            />
          </Head>

          <Layout>
            <Component {...pageProps} />
          </Layout>
        </WalletProvider>
      </IotaClientProvider>
    </QueryClientProvider>
  )
}

export default App
