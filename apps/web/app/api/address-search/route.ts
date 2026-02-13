import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AutocompletePrediction = {
  placeId?: string;
  text?: {
    text?: string;
  };
};

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: AutocompletePrediction;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json([]);
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json([], { status: 500 });
  }

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({
      input: query,
      regionCode: "BR",
      includedRegionCodes: ["BR"],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json([], { status: response.status });
  }

  const data = (await response.json()) as AutocompleteResponse;
  const results =
    data.suggestions
      ?.map((suggestion) => suggestion.placePrediction)
      .filter((prediction): prediction is AutocompletePrediction => Boolean(prediction?.placeId))
      .map((prediction) => ({
        id: prediction.placeId ?? "",
        placeId: prediction.placeId ?? "",
        label: prediction.text?.text ?? "",
      })) ?? [];

  return NextResponse.json(results);
}
