package routes

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
	"go-mvc/app/http/controllers"
	mw "go-mvc/app/http/middleware"
	"go-mvc/app/models"
	"gorm.io/gorm"
	"time"
)

func Web(r fiber.Router, db *gorm.DB) {
	a := controllers.NewAyudaController(db)
	login := controllers.NewAuthController(db)
	profile := controllers.NewProfileController(db)
	auth := mw.Authenticate()
	staff := mw.RequireRole(models.RoleAdmin, models.RoleEnumerator, models.RoleDistributor)
	census := mw.RequireRole(models.RoleAdmin, models.RoleEnumerator)
	distribute := mw.RequireRole(models.RoleAdmin, models.RoleDistributor)
	admin := mw.RequireRole(models.RoleAdmin)
	r.Get("/", func(c fiber.Ctx) error { return c.Redirect().To("/dashboard") })
	r.Get("/login", mw.Guest(), login.ShowLogin)
	r.Post("/login", mw.Guest(), limiter.New(limiter.Config{Max: 10, Expiration: time.Minute}), login.Login)
	r.Post("/logout", auth, login.Logout)
	r.Get("/dashboard", auth, staff, a.Dashboard)
	r.Get("/households", auth, census, a.Households)
	r.Get("/households/create", auth, census, a.CreateHousehold)
	r.Post("/households", auth, census, a.StoreHousehold)
	r.Get("/households/:id", auth, census, a.Household)
	r.Get("/programs", auth, staff, a.Programs)
	r.Post("/programs", auth, admin, a.StoreProgram)
	r.Post("/programs/:id/close", auth, admin, a.CloseProgram)
	r.Post("/enrollments", auth, census, a.Enroll)
	r.Get("/distribute", auth, distribute, a.Distribute)
	r.Get("/claim-lookup", auth, distribute, a.Lookup)
	r.Post("/claims", auth, distribute, a.Claim)
	r.Get("/team", auth, admin, a.Team)
	r.Post("/team", auth, admin, a.StoreStaff)
	r.Delete("/users/:id", auth, admin, controllers.NewUserController(db).Destroy)
	r.Get("/profile", auth, profile.Edit)
	r.Put("/profile", auth, profile.Update)
	r.Put("/profile/password", auth, profile.UpdatePassword)
}
