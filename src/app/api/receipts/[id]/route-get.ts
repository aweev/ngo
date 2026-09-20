export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const token = new URL(request.url).searchParams.get('token');
    return serve('receipt', id, token);
}
