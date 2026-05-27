package password

import "golang.org/x/crypto/bcrypt"

const cost = 12

// Hash bcrypt-hashes a plaintext password.
func Hash(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), cost)
	return string(b), err
}

// Compare returns true if plain matches the stored hash.
func Compare(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
