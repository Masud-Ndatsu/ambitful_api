declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        isEmailVerified: boolean;
      };
      requestId?: string;
    }

    interface Response {
      locals: {
        requestId?: string;
      };
    }
  }
}

export {};
