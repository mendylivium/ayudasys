// Package policies holds authorization rules, like Laravel policies.
package policies

import "go-mvc/app/models"

// ViewPost: published posts are public; drafts only for the owner or an admin.
func ViewPost(u *models.User, p *models.Post) bool {
	return p.Published || UpdatePost(u, p)
}

// UpdatePost: the owner or an admin.
func UpdatePost(u *models.User, p *models.Post) bool {
	return u != nil && (u.ID == p.UserID || u.IsAdmin())
}

// DeletePost follows the same rule as UpdatePost.
func DeletePost(u *models.User, p *models.Post) bool {
	return UpdatePost(u, p)
}
