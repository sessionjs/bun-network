import type { BunNetwork } from "../index";
import type { RequestSogs } from "@session.js/types/network/request";
import type { ResponseSogsRequest } from "@session.js/types/network/response";
import { SessionFetchError, SessionFetchErrorCode } from "@session.js/errors";

export async function sogsRequest(
	this: BunNetwork,
	{ host, endpoint, method, body, headers }: RequestSogs,
): Promise<ResponseSogsRequest> {
	let response: Response;
	try {
		response = await fetch(host + endpoint, {
			method,
			body: body || undefined,
			headers,
		});
	} catch (e) {
		throw new SessionFetchError({
			code: SessionFetchErrorCode.FetchFailed,
			message: e instanceof Error ? e.message : "Unknown fetch error",
		});
	}
	let responseBody: unknown;
	try {
		responseBody = await response.json();
	} catch {
		throw new SessionFetchError({
			code: SessionFetchErrorCode.InvalidResponse,
			message: "Failed to parse JSON response for " + host + endpoint + ": " + response.status,
		});
	}
	return responseBody;
}
