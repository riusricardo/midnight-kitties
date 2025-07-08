/* global console */
import React, { useState, useEffect } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CounterAPI, type CounterState, type CounterProviders } from '@repo/counter-api/common-api';
import { type CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import { CircularProgress } from '@mui/material';
import { AgeVerificationForm, type CredentialSubjectData } from './AgeVerificationForm';

interface CounterProviderProps {
  contractAddress: ContractAddress;
  providers: CounterProviders;
  children: React.ReactNode;
}

interface CounterContextType {
  counterState: CounterState | null;
  incrementCounter: () => Promise<void>;
  counterValue: bigint | null;
  isLoading: boolean;
  error: Error | null;
  showAgeVerification: boolean;
  isVerificationLoading: boolean;
  updateCredentialSubject: (credentialData: any) => Promise<void>;
  closeAgeVerification: () => void;
}

const CounterContext = React.createContext<CounterContextType>({
  counterState: null,
  incrementCounter: async () => {},
  counterValue: null,
  isLoading: false,
  error: null,
  showAgeVerification: false,
  isVerificationLoading: false,
  updateCredentialSubject: async () => {},
  closeAgeVerification: () => {},
});

export const useCounter = () => {
  const context = React.useContext(CounterContext);
  if (context === undefined) {
    throw new Error('useCounter must be used within a CounterProvider');
  }
  return context;
};

export const CounterProvider: React.FC<CounterProviderProps> = ({ contractAddress, providers, children }) => {
  const [counterApi, setCounterApi] = useState<CounterAPI | null>(null);
  const [counterState, setCounterState] = useState<CounterState | null>(null);
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [showAgeVerification, setShowAgeVerification] = useState<boolean>(false);
  const [isVerificationLoading, setIsVerificationLoading] = useState<boolean>(false);
  const [verifiedContracts, setVerifiedContracts] = useState<Set<string>>(new Set());

  // Helper function to check if current contract is verified
  const isContractVerified = (address: string): boolean => {
    return verifiedContracts.has(address);
  };

  const closeAgeVerification = () => {
    setShowAgeVerification(false);
  };

  const updateCredentialSubject = async (credentialData: any) => {
    if (!counterApi) {
      throw new Error('Counter API not initialized');
    }

    try {
      setIsVerificationLoading(true);
      setError(null);

      await (counterApi as any).updateCredentialSubject(credentialData);

      // Mark this contract as verified
      setVerifiedContracts((prev) => new Set([...prev, contractAddress]));
      setShowAgeVerification(false);

      console.log('Successfully updated credential subject for contract:', contractAddress);
    } catch (err) {
      console.error('Error updating credential subject:', err);
      setError(err instanceof Error ? err : new Error('Failed to update credential information'));
      throw err;
    } finally {
      setIsVerificationLoading(false);
    }
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initCounter = async () => {
      // Don't proceed if providers are not ready
      if (!providers) {
        setError(new Error('Providers not initialized'));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // First check if the contract exists
        const exists = await CounterAPI.contractExists(providers, contractAddress);

        if (!exists) {
          throw new Error(`Contract at address ${contractAddress} does not exist`);
        }

        // Connect to the counter contract using unified API (default returns CounterAPI instance)
        const api = await CounterAPI.connect(providers, contractAddress);

        setCounterApi(api);

        // Get initial counter value
        const value = await api.getCounterValue();
        setCounterValue(value);

        // Subscribe to state changes
        const subscription = api.state$.subscribe({
          next: (state: CounterState) => {
            setCounterState(state);
            setCounterValue(state.counterValue);
          },
          error: (err: Error) => {
            setError(err);
          },
        });

        setIsLoading(false);

        // Store cleanup function
        cleanup = () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error('Unknown error initializing counter'));
      }
    };

    // Only initialize if providers are available
    if (providers && contractAddress) {
      void initCounter();
    }

    // Cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [contractAddress, providers]);

  const incrementCounter = async () => {
    if (!counterApi) {
      setError(new Error('Counter API not initialized'));
      return;
    }

    // Check if user is verified for this specific contract
    if (!isContractVerified(contractAddress)) {
      setShowAgeVerification(true);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 CounterDeploy: Starting increment operation...');
      console.log('🔍 CounterDeploy: Contract address:', contractAddress);
      console.log('🔍 CounterDeploy: Current counter value:', counterValue);
      console.log('🔍 CounterDeploy: Providers available:', !!providers);

      // Check if providers are still valid
      if (!providers || !providers.privateStateProvider || !providers.publicDataProvider) {
        throw new Error('Providers not properly initialized');
      }

      console.log('✅ CounterDeploy: Providers validation passed');

      await counterApi.increment();
      console.log('✅ CounterDeploy: Increment operation completed successfully');

      // The state$ observable will update the UI
    } catch (err) {
      console.error('❌ CounterDeploy: Increment operation failed:', err);

      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to increment counter';
      if (err instanceof Error) {
        if (err.message.includes('invalid string length')) {
          errorMessage =
            'Transaction failed due to validation error. This may be due to incomplete provider setup or network issues.';
        } else if (err.message.includes('verifier key')) {
          errorMessage =
            'Contract verification failed. The contract version may be incompatible with the current network.';
        } else if (err.message.includes('proof')) {
          errorMessage = 'Proof generation failed. Please check your connection to the proof server.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CounterContext.Provider
      value={{
        counterState,
        incrementCounter,
        counterValue,
        isLoading,
        error,
        showAgeVerification,
        isVerificationLoading,
        updateCredentialSubject,
        closeAgeVerification,
      }}
    >
      {children}
    </CounterContext.Provider>
  );
};

export const CounterDisplay: React.FC<{
  contractAddress: ContractAddress;
  walletPublicKey?: string;
}> = ({ contractAddress, walletPublicKey }) => {
  const {
    counterValue,
    isLoading,
    error,
    incrementCounter,
    showAgeVerification,
    isVerificationLoading,
    updateCredentialSubject,
    closeAgeVerification,
  } = useCounter();

  // Helper to format contract address for display
  const formatContractAddress = (address: string, groupSize = 4): string => {
    return address.replace(new RegExp(`(.{${groupSize}})`, 'g'), '$1 ').trim();
  };

  const handleAgeVerification = async (credentialData: CredentialSubjectData) => {
    await updateCredentialSubject(credentialData);
  };

  if (isLoading) {
    return (
      <div className="counter-container">
        <div className="loading-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CircularProgress size={18} />
          Loading counter...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="counter-container">
        <div
          className="error-message"
          style={{
            color: '#d32f2f',
            padding: '16px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2',
            marginBottom: '16px',
          }}
        >
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Age Verification Modal */}
      {showAgeVerification && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={closeAgeVerification}
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                background: '#ff1744',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 30,
                height: 30,
                cursor: 'pointer',
                zIndex: 1001,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            <AgeVerificationForm
              onSubmit={handleAgeVerification}
              isLoading={isVerificationLoading}
              error={error}
              walletPublicKey={walletPublicKey}
            />
          </div>
        </div>
      )}

      {/* Contract Address Display */}
      <div
        style={{
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: '#f8fafc',
            border: '1.5px solid #1976d2',
            borderRadius: '6px',
            padding: '12px 18px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            letterSpacing: '1px',
            color: '#222',
            minWidth: '540px',
            maxWidth: '100%',
            wordBreak: 'break-all',
            boxShadow: '0 2px 8px 0 rgba(25, 118, 210, 0.07)',
          }}
        >
          <span style={{ color: '#1976d2', fontWeight: 600 }}>Contract Address:</span>
          <br />
          <span style={{ userSelect: 'all', fontWeight: 500 }}>{formatContractAddress(contractAddress)}</span>
        </div>
      </div>

      {/* Counter Value Display */}
      <div
        className="counter-container"
        style={{
          padding: '24px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            margin: '0 0 20px 0',
            color: '#333',
            textAlign: 'center',
          }}
        >
          Counter Deploy
        </h2>

        <div
          className="counter-value-display"
          style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #1976d2',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px',
            }}
          >
            Current Counter Value:
          </div>
          <div
            style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#1976d2',
              fontFamily: 'monospace',
            }}
          >
            {counterValue?.toString() || '0'}
          </div>
        </div>

        <button
          className="increment-button"
          onClick={() => {
            void incrementCounter();
          }}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#cccccc' : '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {isLoading ? 'Incrementing...' : 'Increment Counter'}
        </button>
      </div>
    </div>
  );
};

export const DeployCounterButton: React.FC<{
  providers: CounterProviders;
  // eslint-disable-next-line no-unused-vars
  onDeployed: (_address: ContractAddress) => void;
}> = ({ providers, onDeployed }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<string>('');

  const deployCounter = async () => {
    try {
      console.log('🚀 CounterDeploy: Starting deployment...');
      setIsDeploying(true);
      setError(null);
      setDeploymentProgress('Preparing deployment...');

      console.log('🔍 CounterDeploy: Checking providers...');
      console.log('providers object:', providers);

      // Validate that we have the necessary providers
      if (!providers || !providers.publicDataProvider || !providers.privateStateProvider) {
        console.error('❌ CounterDeploy: Missing providers');
        throw new Error('Missing required providers for deployment');
      }

      console.log('✅ CounterDeploy: Providers validation passed');
      setDeploymentProgress('Deploying counter contract...');

      try {
        // Use deploy function from unified API with default return type (CounterAPI instance)
        const initialPrivateState: CounterPrivateState = { value: 0 };
        console.log('📦 CounterDeploy: Private state:', initialPrivateState);

        const deployedApi = await CounterAPI.deploy(providers, initialPrivateState);
        console.log('✅ CounterDeploy: Deploy call completed successfully');

        if (!deployedApi || !deployedApi.deployedContractAddress) {
          throw new Error('Deployment succeeded but failed to get contract address');
        }

        const contractAddress = deployedApi.deployedContractAddress;
        setDeploymentProgress('Deployment successful!');

        onDeployed(contractAddress);
        setIsDeploying(false);
        setDeploymentProgress('');
      } catch (deploymentError) {
        console.error('❌ CounterDeploy: Deployment error caught:', deploymentError);
        // Handle specific verifier key version errors
        if (
          deploymentError instanceof Error &&
          (deploymentError.message.includes('VerifierKey') || deploymentError.message.includes('Unsupported version'))
        ) {
          setDeploymentProgress('');
          throw new Error('Contract deployment failed.' + `Technical details: ${deploymentError.message}`);
        }
        throw deploymentError;
      }
    } catch (err) {
      console.error('❌ CounterDeploy: Top-level error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deploy counter contract';
      setError(new Error(errorMessage));
      setIsDeploying(false);
      setDeploymentProgress('');
    }
  };

  return (
    <div className="deploy-counter-container">
      <button
        className="deploy-button"
        onClick={deployCounter}
        disabled={isDeploying}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: isDeploying ? '#cccccc' : '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isDeploying ? 'not-allowed' : 'pointer',
        }}
      >
        {isDeploying ? 'Deploying...' : 'Deploy New Counter Contract'}
      </button>

      {deploymentProgress && (
        <div
          className="deployment-progress"
          style={{
            marginTop: '8px',
            color: '#1976d2',
            fontWeight: 'bold',
          }}
        >
          {deploymentProgress}
        </div>
      )}

      {error && (
        <div
          className="error-message"
          style={{
            marginTop: '8px',
            color: '#d32f2f',
            padding: '8px',
            backgroundColor: '#ffebee',
            borderRadius: '4px',
            border: '1px solid #ffcdd2',
          }}
        >
          Error: {error.message}
        </div>
      )}
    </div>
  );
};

// CounterApplication component
export const CounterApplication: React.FC<{
  contractAddress?: ContractAddress;
  providers: CounterProviders;
  walletPublicKey?: string;
}> = ({ contractAddress, providers, walletPublicKey }) => {
  const [deployedAddress, setDeployedAddress] = useState<ContractAddress | undefined>(contractAddress);

  // Show loading state if providers are not ready
  if (!providers) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Loading providers...</div>
      </div>
    );
  }

  if (!deployedAddress) {
    return <DeployCounterButton providers={providers} onDeployed={(address) => setDeployedAddress(address)} />;
  }

  return (
    <CounterProvider contractAddress={deployedAddress} providers={providers}>
      <CounterDisplay contractAddress={deployedAddress} walletPublicKey={walletPublicKey} />
    </CounterProvider>
  );
};
