export default {
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    return new Response(`Endpoint ${requestUrl.pathname} not found.`, {
      status: 404,
    });
  },
};
