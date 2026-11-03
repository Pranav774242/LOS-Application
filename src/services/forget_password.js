const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://los-backend-dqay.onrender.com";

export async function requestPasswordReset(credentials) {
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
