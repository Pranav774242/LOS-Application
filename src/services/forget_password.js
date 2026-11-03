const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

export async function requestPasswordReset(credentials) {
	if (!API_BASE_URL) {
		throw new Error("NEXT_PUBLIC_API_URL is not configured.");
	}

	const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(credentials),
	});

	if (!response.ok) {
		let message = "Unable to send the password reset request";

		try {
			const error = await response.json();
			message = error.message || error.error || message;
		} catch {
			// The backend may return an empty or non-JSON error response.
		}

		throw new Error(message);
	}

	return response.json();
}
