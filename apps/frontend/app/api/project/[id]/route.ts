import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id: projectId } = await context.params;

    return NextResponse.json({
      status: "healthy!",
      projectId,
      env: process.env.ENV,
    });
  } catch (error) {
    console.error("Error in health check:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
