import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, FileText, ExternalLink } from 'lucide-react';
import { API_BASE } from '../config/api';

interface ContractData {
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: string;
  contractTerms: string;
  paymentInstructions: string | null;
  stripePaymentLink: string | null;
  agreedAt: string | null;
  clientName: string | null;
}

const ContractView = () => {
  const { token } = useParams<{ token: string }>();

  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agreeing, setAgreeing] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    document.title = 'Contract | Lyne Tilt Studio';
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchContract = async () => {
      try {
        const res = await fetch(`${API_BASE}/contracts/${token}`);
        if (res.status === 404) {
          setError('This contract link is not valid.');
          return;
        }
        if (res.status === 410) {
          const data = await res.json();
          setError(data.error || 'This contract is no longer available.');
          return;
        }
        if (!res.ok) throw new Error('Failed to load contract');
        const data = await res.json();
        setContract(data);
        if (data.status === 'agreed' || data.status === 'paid') {
          setAgreed(true);
        }
      } catch {
        setError('Something went wrong. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  const handleAgree = async () => {
    if (!token) return;
    setAgreeing(true);
    try {
      const res = await fetch(`${API_BASE}/contracts/${token}/agree`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to process agreement');
        return;
      }
      setAgreed(true);
      if (contract) {
        setContract({ ...contract, status: 'agreed', agreedAt: new Date().toISOString() });
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAgreeing(false);
    }
  };

  // Error / not found state
  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-stone-800 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
            Contract Unavailable
          </h1>
          <p className="text-stone-500">{error}</p>
          <Link
            to="/"
            className="inline-block mt-6 text-sm font-medium hover:underline"
            style={{ color: '#8d3038' }}
          >
            Go to Lyne Tilt Studio
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        <span className="ml-2 text-sm text-stone-500">Loading contract...</span>
      </div>
    );
  }

  if (!contract) return null;

  const isPaid = contract.status === 'paid';

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-6 py-6 text-center">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'Georgia, serif', color: '#8d3038' }}
          >
            Lyne Tilt Studio
          </h1>
          <p className="text-sm text-stone-500 mt-1">Contract & Payment</p>
        </div>
      </div>

      {/* Contract content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Contract card */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Title section */}
          <div className="px-8 py-6 border-b border-stone-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8d303815' }}>
                <FileText className="w-5 h-5" style={{ color: '#8d3038' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  className="text-xl font-bold text-stone-900"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {contract.title}
                </h2>
                {contract.description && (
                  <p className="text-stone-600 mt-1 text-sm leading-relaxed">
                    {contract.description}
                  </p>
                )}
                {contract.clientName && (
                  <p className="text-xs text-stone-400 mt-2">
                    Prepared for {contract.clientName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="px-8 py-5 bg-stone-50 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-500 mb-1">Total Amount</p>
            <p className="text-3xl font-bold" style={{ color: '#8d3038' }}>
              ${parseFloat(contract.amount).toLocaleString('en-AU', { minimumFractionDigits: 2 })} <span className="text-base font-normal text-stone-400">{contract.currency}</span>
            </p>
          </div>

          {/* Terms */}
          <div className="px-8 py-6 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-3">
              Terms & Conditions
            </h3>
            <div className="prose prose-sm prose-stone max-w-none">
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                {contract.contractTerms}
              </p>
            </div>
          </div>

          {/* Payment instructions (if any) */}
          {contract.paymentInstructions && !isPaid && (
            <div className="px-8 py-5 border-b border-stone-100 bg-amber-50/50">
              <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-2">
                Payment Details
              </h3>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                {contract.paymentInstructions}
              </p>
            </div>
          )}

          {/* Action area */}
          <div className="px-8 py-6">
            {isPaid ? (
              /* Already paid */
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <h3
                  className="text-lg font-bold text-stone-900 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Payment Complete
                </h3>
                <p className="text-sm text-stone-500">
                  Thank you! Your payment has been received and confirmed.
                </p>
              </div>
            ) : agreed ? (
              /* Agreed but not yet paid */
              <div className="text-center py-4">
                <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#8d3038' }} />
                <h3
                  className="text-lg font-bold text-stone-900 mb-1"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Agreement Confirmed
                </h3>
                <p className="text-sm text-stone-500 mb-4">
                  Thank you for reviewing and accepting the terms.
                  {contract.agreedAt && (
                    <span className="block mt-1 text-xs text-stone-400">
                      Agreed on {new Date(contract.agreedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>

                {/* Payment instructions after agreement */}
                {contract.paymentInstructions && (
                  <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 text-left mt-4">
                    <h4 className="text-sm font-semibold text-stone-700 mb-2">Payment Details</h4>
                    <p className="text-sm text-stone-600 whitespace-pre-wrap">{contract.paymentInstructions}</p>
                  </div>
                )}

                {/* Stripe link if available */}
                {contract.stripePaymentLink && (
                  <a
                    href={contract.stripePaymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-lg text-white font-medium text-sm transition-colors"
                    style={{ backgroundColor: '#8d3038' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#6b2228')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8d3038')}
                  >
                    Proceed to Payment
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {!contract.stripePaymentLink && !contract.paymentInstructions && (
                  <p className="text-sm text-stone-400 mt-2">
                    Payment details will be sent separately.
                  </p>
                )}
              </div>
            ) : (
              /* Not yet agreed */
              <div>
                <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 mb-5">
                  <p className="text-sm text-stone-600 leading-relaxed">
                    By clicking <strong>"I Agree & Accept"</strong> below, you acknowledge that you have read, understood, and agree to the terms and conditions outlined above.
                  </p>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleAgree}
                    disabled={agreeing}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-white font-medium text-base transition-colors disabled:opacity-60"
                    style={{ backgroundColor: '#8d3038' }}
                    onMouseEnter={(e) => !agreeing && (e.currentTarget.style.backgroundColor = '#6b2228')}
                    onMouseLeave={(e) => !agreeing && (e.currentTarget.style.backgroundColor = '#8d3038')}
                  >
                    {agreeing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    I Agree & Accept
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-stone-400">
            Lyne Tilt Studio &mdash; Wearable Art & Creative Coaching
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractView;
