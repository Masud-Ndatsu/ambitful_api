declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
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
