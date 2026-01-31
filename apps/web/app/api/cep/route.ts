import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCep = searchParams.get("cep") ?? "";
  const cep = rawCep.replace(/\D/g, "").slice(0, 8);

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  if (!response.ok) {
    return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
