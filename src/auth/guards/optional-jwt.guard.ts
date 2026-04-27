import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — attaches user to request if a valid token is present,
 * but does not reject unauthenticated requests. Used for guest-mode endpoints.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Return user if authenticated, null if not — never throw
    return user || null;
  }
}
