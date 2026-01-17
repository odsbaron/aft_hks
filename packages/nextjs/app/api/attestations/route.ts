/**
 * API Route for handling attestations
 * POST /api/attestations - Submit a signature
 * GET /api/attestations?market=0x... - Get attestations for a market
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory storage (use Redis/Database in production)
interface AttestationRecord {
  market: string;
  signature: string;
  outcome: number;
  signer: string;
  timestamp: number;
}

const attestations = new Map<string, AttestationRecord[]>(); // market -> attestations

// POST /api/attestations - Submit a new attestation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, signature, outcome, signer } = body;

    // Validation
    if (!market || !signature || outcome === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: market, signature, outcome" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(market)) {
      return NextResponse.json(
        { error: "Invalid market address" },
        { status: 400 }
      );
    }

    // Validate outcome
    if (outcome !== 0 && outcome !== 1) {
      return NextResponse.json(
        { error: "Invalid outcome: must be 0 (NO) or 1 (YES)" },
        { status: 400 }
      );
    }

    // Validate signature format (basic check)
    if (!/^0x[a-fA-F0-9]{130,132}$/.test(signature)) {
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 400 }
      );
    }

    // Initialize array for this market if needed
    if (!attestations.has(market)) {
      attestations.set(market, []);
    }

    const marketAttestations = attestations.get(market)!;

    // Check for duplicate signatures (optional - skip for now)
    // In production, verify the signature matches the signer

    // Add attestation
    const record: AttestationRecord = {
      market,
      signature,
      outcome,
      signer: signer || "0x",
      timestamp: Date.now(),
    };

    marketAttestations.push(record);

    // Return success with current count
    return NextResponse.json({
      success: true,
      count: marketAttestations.length,
      attestation: {
        market,
        outcome,
        timestamp: record.timestamp,
      },
    });
  } catch (error) {
    console.error("Attestation submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/attestations?market=0x... - Get attestations for a market
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get("market");

    if (!market) {
      return NextResponse.json(
        { error: "Market address is required" },
        { status: 400 }
      );
    }

    const marketAttestations = attestations.get(market) || [];

    // Return summary (not full signatures for security)
    return NextResponse.json({
      market,
      count: marketAttestations.length,
      attestations: marketAttestations.map((a) => ({
        outcome: a.outcome,
        signer: a.signer,
        timestamp: a.timestamp,
      })),
    });
  } catch (error) {
    console.error("Attestation fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/attestations - Clear attestations (dev only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get("market");

    if (market) {
      attestations.delete(market);
      return NextResponse.json({ success: true, message: `Cleared attestations for ${market}` });
    } else {
      attestations.clear();
      return NextResponse.json({ success: true, message: "Cleared all attestations" });
    }
  } catch (error) {
    console.error("Attestation clear error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
