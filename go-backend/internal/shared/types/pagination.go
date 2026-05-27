package types

import "strconv"

// Page holds pagination parameters parsed from query strings.
type Page struct {
	Limit int64
	Skip  int64
	Page  int64
}

// ParsePage extracts limit/page query params with sane defaults.
func ParsePage(limitStr, pageStr string) Page {
	limit, _ := strconv.ParseInt(limitStr, 10, 64)
	page, _ := strconv.ParseInt(pageStr, 10, 64)
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if page <= 0 {
		page = 1
	}
	return Page{
		Limit: limit,
		Page:  page,
		Skip:  (page - 1) * limit,
	}
}

// PagedResult wraps a list result with pagination metadata.
type PagedResult[T any] struct {
	Items []T   `json:"items"`
	Total int64 `json:"total"`
	Page  int64 `json:"page"`
	Limit int64 `json:"limit"`
}
