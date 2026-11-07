package policies

import "go-mvc/app/models"

// UpdateUser: yourself or an admin.
func UpdateUser(u *models.User, target *models.User) bool {
	return u != nil && (u.ID == target.ID || u.IsAdmin())
}

// DeleteUser: admins only, and never their own account.
func DeleteUser(u *models.User, target *models.User) bool {
	return u != nil && u.IsAdmin() && u.ID != target.ID
}
