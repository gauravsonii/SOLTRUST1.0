import './App.css';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import './App.css'

// import to fix polyfill issue with buffer with webpack
import * as buffer from "buffer";
window.Buffer = buffer.Buffer;


// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
* @description gets Phantom provider, if it exists
*/
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

// ... (import statements and types)

export default function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [receiverPublicKey, setReceiverPublicKey] = useState<PublicKey | undefined>(
    undefined
  );
  const [senderKeypair, setSenderKeypair] = useState<Keypair | undefined>(
    undefined
  );
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
  }, []);

  const createSender = async () => {
    try {
      const senderKeypair = Keypair.generate();
      console.log('Sender account: ', senderKeypair.publicKey.toString());

      const airdropSignature = await connection.requestAirdrop(
        senderKeypair.publicKey,
        LAMPORTS_PER_SOL * 2
      );

      await connection.confirmTransaction(airdropSignature);
      console.log('Airdrop transaction signature:', airdropSignature);
      console.log('Wallet Balance:', (await connection.getBalance(senderKeypair.publicKey)) / LAMPORTS_PER_SOL);

      setSenderKeypair(senderKeypair);
    } catch (error) {
      console.error('Error creating sender:', error);
    }
  };

  const connectWallet = async () => {
    const provider = getProvider();
    if (provider) {
      try {
        const { publicKey } = await provider.connect();
        console.log('Connected to Phantom Wallet. Public key:', publicKey.toBase58());
        setReceiverPublicKey(publicKey);
      } catch (err) {
        console.error('Error connecting to Phantom Wallet:', err);
      }
    }
  };

  const disconnectWallet = async () => {
    const provider = getProvider();
    if (provider) {
      try {
        await provider.disconnect();
        setReceiverPublicKey(undefined);
        console.log("Wallet disconnected");
      } catch (err) {
        console.error('Error disconnecting from Phantom Wallet:', err);
      }
    }
  };

  const transferSol = async () => {
    try {
      if (!senderKeypair || !receiverPublicKey) {
        console.error('Sender KeyPair or Receiver Public Key missing');
        return;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: receiverPublicKey!,
          lamports: LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair]
      );

      console.log('Transfer transaction signature:', signature);
      console.log('Sender Balance:', (await connection.getBalance(senderKeypair.publicKey)) / LAMPORTS_PER_SOL);
      console.log('Receiver Balance:', (await connection.getBalance(receiverPublicKey)) / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error transferring SOL:', error);
      console.log("game error")
    }
  };

  // HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h2>Module 2 Assessment</h2>
        <span className="buttons">
          <button className="button" onClick={createSender}>
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button className="button" onClick={connectWallet}>
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button className="button" onClick={disconnectWallet}>
                Disconnect from Wallet
              </button>
              <button className="button" onClick={transferSol}>
                Transfer SOL to Phantom Wallet
              </button>
            </div>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}