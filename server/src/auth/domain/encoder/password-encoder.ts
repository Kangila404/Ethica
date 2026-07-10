export const PASSWORD_ENCODER = Symbol('PASSWORD_ENCODER');

export interface PasswordEncoder {
    encode(plain: string): Promise<string>;
    matches(plain: string, hashed: string): Promise<boolean>;
}