package controllers

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"

	"go-mvc/app/auth"
	"go-mvc/app/http/requests"
	"go-mvc/app/models"
	"go-mvc/app/policies"
	"go-mvc/pkg/inertia"
	"go-mvc/pkg/pagination"
)

type PostController struct {
	db *gorm.DB
}

func NewPostController(db *gorm.DB) *PostController {
	return &PostController{db: db}
}

// GET /posts?mine=1&page=N
func (p *PostController) Index(c fiber.Ctx) error {
	user := auth.User(c)
	mine := c.Query("mine") == "1" && user != nil

	q := p.db.Model(&models.Post{}).Scopes(models.WithAuthor).Order("created_at DESC")
	if mine {
		q = q.Where("user_id = ?", user.ID)
	} else {
		q = q.Scopes(models.Published)
	}

	posts, err := pagination.Paginate[models.Post](c, q, 9)
	if err != nil {
		return err
	}
	return inertia.Render(c, "Posts/Index", fiber.Map{
		"posts":   posts,
		"filters": fiber.Map{"mine": mine},
	})
}

// GET /posts/:id
func (p *PostController) Show(c fiber.Ctx) error {
	post, err := p.find(c, true)
	if err != nil {
		return err
	}
	user := auth.User(c)
	if !policies.ViewPost(user, post) {
		return fiber.ErrNotFound
	}
	return inertia.Render(c, "Posts/Show", fiber.Map{
		"post": post,
		"can":  fiber.Map{"update": policies.UpdatePost(user, post), "delete": policies.DeletePost(user, post)},
	})
}

// GET /posts/create
func (p *PostController) Create(c fiber.Ctx) error {
	return inertia.Render(c, "Posts/Create", nil)
}

// POST /posts
func (p *PostController) Store(c fiber.Ctx) error {
	var req requests.StorePostRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	post := models.Post{
		Title:     req.Title,
		Body:      req.Body,
		Published: req.Published,
		UserID:    auth.User(c).ID,
	}
	if err := p.db.Create(&post).Error; err != nil {
		return err
	}
	return redirect(c, "/posts/"+strconv.Itoa(int(post.ID)), "success", "Post created.")
}

// GET /posts/:id/edit
func (p *PostController) Edit(c fiber.Ctx) error {
	post, err := p.find(c, false)
	if err != nil {
		return err
	}
	if !policies.UpdatePost(auth.User(c), post) {
		return fiber.ErrForbidden
	}
	return inertia.Render(c, "Posts/Edit", fiber.Map{"post": post})
}

// PUT /posts/:id
func (p *PostController) Update(c fiber.Ctx) error {
	post, err := p.find(c, false)
	if err != nil {
		return err
	}
	if !policies.UpdatePost(auth.User(c), post) {
		return fiber.ErrForbidden
	}

	var req requests.StorePostRequest
	if ok, err := bind(c, &req); !ok {
		return err
	}

	post.Title, post.Body, post.Published = req.Title, req.Body, req.Published
	if err := p.db.Save(post).Error; err != nil {
		return err
	}
	return redirect(c, "/posts/"+strconv.Itoa(int(post.ID)), "success", "Post updated.")
}

// DELETE /posts/:id
func (p *PostController) Destroy(c fiber.Ctx) error {
	post, err := p.find(c, false)
	if err != nil {
		return err
	}
	if !policies.DeletePost(auth.User(c), post) {
		return fiber.ErrForbidden
	}
	if err := p.db.Delete(post).Error; err != nil {
		return err
	}
	return redirect(c, "/posts?mine=1", "success", "Post deleted.")
}

func (p *PostController) find(c fiber.Ctx, withUser bool) (*models.Post, error) {
	id, err := paramID(c)
	if err != nil {
		return nil, err
	}
	q := p.db
	if withUser {
		q = q.Scopes(models.WithAuthor)
	}
	var post models.Post
	if err := q.First(&post, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fiber.ErrNotFound
		}
		return nil, err
	}
	return &post, nil
}
