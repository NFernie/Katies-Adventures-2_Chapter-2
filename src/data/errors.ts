/** Thrown when personal data is requested without a signed-in session. */
export class SignedOutError extends Error {
  constructor(message = "getOwnerId requires a signed-in session") {
    super(message);
    this.name = "SignedOutError";
  }
}

/** Thrown when a gateway call fails after a session exists. */
export class GatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayError";
  }
}
