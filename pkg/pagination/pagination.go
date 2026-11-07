// Package pagination implements a Laravel-like length-aware paginator for GORM.
package pagination

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type Page[T any] struct {
	Data        []T   `json:"data"`
	Total       int64 `json:"total"`
	PerPage     int   `json:"per_page"`
	CurrentPage int   `json:"current_page"`
	LastPage    int   `json:"last_page"`
	From        int   `json:"from"`
	To          int   `json:"to"`
}

// Paginate runs query for the page given by ?page= (1-based).
func Paginate[T any](c fiber.Ctx, query *gorm.DB, perPage int) (Page[T], error) {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	page = max(page, 1)

	p := Page[T]{Data: []T{}, PerPage: perPage, CurrentPage: page}
	if err := query.Session(&gorm.Session{}).Count(&p.Total).Error; err != nil {
		return p, err
	}
	p.LastPage = max(int((p.Total+int64(perPage)-1)/int64(perPage)), 1)

	if err := query.Offset((page - 1) * perPage).Limit(perPage).Find(&p.Data).Error; err != nil {
		return p, err
	}
	if len(p.Data) > 0 {
		p.From = (page-1)*perPage + 1
		p.To = p.From + len(p.Data) - 1
	}
	return p, nil
}
