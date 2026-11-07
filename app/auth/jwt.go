package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// JWT issues and verifies API tokens.
type JWT struct {
	Secret []byte
	TTL    time.Duration
}

func NewJWT(secret string, ttl time.Duration) *JWT {
	return &JWT{Secret: []byte(secret), TTL: ttl}
}

// Issue creates a signed token for the given user.
func (j *JWT) Issue(userID uint, email, role string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(j.TTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(j.Secret)
}

// Parse validates a token string and returns its claims.
func (j *JWT) Parse(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(*jwt.Token) (any, error) {
		return j.Secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
