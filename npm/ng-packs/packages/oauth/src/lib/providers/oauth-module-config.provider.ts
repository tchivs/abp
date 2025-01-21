import {
  AuthService,
  AuthGuard,
  authGuard,
  ApiInterceptor,
  PIPE_TO_LOGIN_FN_KEY,
  CHECK_AUTHENTICATION_STATE_FN_KEY,
  AbpLocalStorageService,
  AuthErrorFilterService,
} from '@abp/ng.core';
import { Provider, makeEnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { OAuthModule, OAuthStorage } from 'angular-oauth2-oidc';
import { AbpOAuthGuard, abpOAuthGuard } from '../guards';
import { OAuthConfigurationHandler } from '../handlers';
import { OAuthApiInterceptor } from '../interceptors';
import { AbpOAuthService, OAuthErrorFilterService } from '../services';
import { pipeToLogin, checkAccessToken } from '../utils';
import { NavigateToManageProfileProvider } from './navigate-to-manage-profile.provider';

export function provideAbpOAuth() {
  const providers = [
    {
      provide: AuthService,
      useClass: AbpOAuthService,
    },
    {
      provide: AuthGuard,
      useClass: AbpOAuthGuard,
    },
    {
      provide: authGuard,
      useValue: abpOAuthGuard,
    },
    {
      provide: ApiInterceptor,
      useClass: OAuthApiInterceptor,
    },
    {
      provide: PIPE_TO_LOGIN_FN_KEY,
      useValue: pipeToLogin,
    },
    {
      provide: CHECK_AUTHENTICATION_STATE_FN_KEY,
      useValue: checkAccessToken,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useExisting: ApiInterceptor,
      multi: true,
    },
    NavigateToManageProfileProvider,
    provideAppInitializer(() => {
      inject(OAuthConfigurationHandler);
    }),
    OAuthModule.forRoot().providers as Provider[],
    { provide: OAuthStorage, useClass: AbpLocalStorageService },
    { provide: AuthErrorFilterService, useExisting: OAuthErrorFilterService },
  ];

  return makeEnvironmentProviders(providers);
}
