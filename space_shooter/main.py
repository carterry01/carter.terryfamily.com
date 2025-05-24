import pygame
import random
import math
import json
import os
from pygame import mixer

# Initialize Pygame and its sound mixer
pygame.init()
mixer.init()

# Constants
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
PURPLE = (128, 0, 128)
ORANGE = (255, 165, 0)

# Set up the display
screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
pygame.display.set_caption('Space Shooter')
clock = pygame.time.Clock()

# Create sounds directory if it doesn't exist
if not os.path.exists('sounds'):
    os.makedirs('sounds')

# Sound effects
def create_sound_effects():
    # Create empty sound effects for now
    return {
        'laser': None,
        'explosion': None,
        'powerup': None,
        'game_over': None
    }

# Create sound effects
sounds = create_sound_effects()

# Background music
def play_background_music():
    # Skip background music for now
    pass

# Load high score
def load_high_score():
    try:
        with open('highscore.json', 'r') as f:
            return json.load(f)['high_score']
    except:
        return 0

def save_high_score(score):
    with open('highscore.json', 'w') as f:
        json.dump({'high_score': score}, f)

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        # Create a more interesting player shape
        self.image = pygame.Surface((50, 40), pygame.SRCALPHA)
        pygame.draw.polygon(self.image, GREEN, [(25, 0), (0, 40), (50, 40)])
        pygame.draw.polygon(self.image, (0, 200, 0), [(25, 10), (10, 35), (40, 35)])
        self.rect = self.image.get_rect()
        self.rect.centerx = WINDOW_WIDTH // 2
        self.rect.bottom = WINDOW_HEIGHT - 10
        self.speed = 8
        self.health = 100
        self.lives = 3
        self.shoot_delay = 250
        self.last_shot = pygame.time.get_ticks()
        self.power = 1
        self.power_time = pygame.time.get_ticks()
        self.shield = 0
        self.shield_time = pygame.time.get_ticks()
        self.rapid_fire = False
        self.rapid_fire_time = pygame.time.get_ticks()
        self.spread_shot = False
        self.spread_shot_time = pygame.time.get_ticks()
        self.invincible = False
        self.invincible_time = pygame.time.get_ticks()
        self.engine_particles = []

    def update(self):
        # Movement
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] and self.rect.left > 0:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT] and self.rect.right < WINDOW_WIDTH:
            self.rect.x += self.speed
        
        # Shooting
        if keys[pygame.K_SPACE]:
            self.shoot()

        # Power-up timeouts
        now = pygame.time.get_ticks()
        if self.power >= 2 and now - self.power_time > 5000:
            self.power = 1
            self.power_time = now

        if self.shield > 0 and now - self.shield_time > 3000:
            self.shield = 0
            self.shield_time = now

        if self.rapid_fire and now - self.rapid_fire_time > 5000:
            self.rapid_fire = False
            self.rapid_fire_time = now

        if self.spread_shot and now - self.spread_shot_time > 5000:
            self.spread_shot = False
            self.spread_shot_time = now

        if self.invincible and now - self.invincible_time > 2000:
            self.invincible = False
            self.invincible_time = now

        # Add engine particles
        if random.random() < 0.3:
            self.engine_particles.append({
                'x': self.rect.centerx + random.randint(-10, 10),
                'y': self.rect.bottom,
                'speed': random.randint(2, 5),
                'size': random.randint(2, 4)
            })

        # Update engine particles
        for particle in self.engine_particles[:]:
            particle['y'] += particle['speed']
            if particle['y'] > WINDOW_HEIGHT:
                self.engine_particles.remove(particle)

    def shoot(self):
        now = pygame.time.get_ticks()
        shoot_delay = 100 if self.rapid_fire else 250
        if now - self.last_shot > shoot_delay:
            self.last_shot = now
            if self.spread_shot:
                # Create spread shot pattern
                angles = [-30, 0, 30]  # Angles in degrees
                for angle in angles:
                    bullet = Bullet(self.rect.centerx, self.rect.top)
                    # Convert angle to radians and adjust bullet speed
                    rad_angle = math.radians(angle)
                    bullet.speedx = math.sin(rad_angle) * 5
                    bullet.speedy = -math.cos(rad_angle) * 10
                    all_sprites.add(bullet)
                    bullets.add(bullet)
            elif self.power == 1:
                bullet = Bullet(self.rect.centerx, self.rect.top)
                all_sprites.add(bullet)
                bullets.add(bullet)
            elif self.power >= 2:
                bullet1 = Bullet(self.rect.left, self.rect.centery)
                bullet2 = Bullet(self.rect.right, self.rect.centery)
                all_sprites.add(bullet1)
                all_sprites.add(bullet2)
                bullets.add(bullet1)
                bullets.add(bullet2)

    def draw(self, surface):
        # Draw engine particles
        for particle in self.engine_particles:
            pygame.draw.circle(surface, YELLOW, 
                             (int(particle['x']), int(particle['y'])), 
                             particle['size'])

        # Draw the player
        if self.invincible and pygame.time.get_ticks() % 200 < 100:
            # Make the player flash when invincible
            return
        surface.blit(self.image, self.rect)

        # Draw shield effect
        if self.shield > 0:
            pygame.draw.circle(surface, GREEN, self.rect.center, 
                             self.rect.width + 10, 2)

class Enemy(pygame.sprite.Sprite):
    def __init__(self, boss=False):
        super().__init__()
        self.boss = boss
        if boss:
            self.image = pygame.Surface((100, 100), pygame.SRCALPHA)
            pygame.draw.polygon(self.image, PURPLE, [(50, 0), (0, 100), (100, 100)])
            pygame.draw.polygon(self.image, (200, 0, 200), [(50, 20), (20, 80), (80, 80)])
            self.health = 20
            self.speed = 1
            self.score = 1000
            self.shoot_delay = 1000
            self.last_shot = pygame.time.get_ticks()
            self.engine_particles = []
        else:
            self.type = random.choice(['small', 'medium', 'large'])
            if self.type == 'small':
                self.image = pygame.Surface((30, 30), pygame.SRCALPHA)
                pygame.draw.circle(self.image, RED, (15, 15), 15)
                self.health = 1
                self.speed = 5
                self.score = 100
            elif self.type == 'medium':
                self.image = pygame.Surface((50, 50), pygame.SRCALPHA)
                pygame.draw.circle(self.image, BLUE, (25, 25), 25)
                self.health = 2
                self.speed = 3
                self.score = 200
            else:
                self.image = pygame.Surface((70, 70), pygame.SRCALPHA)
                pygame.draw.circle(self.image, YELLOW, (35, 35), 35)
                self.health = 3
                self.speed = 2
                self.score = 300
        
        self.rect = self.image.get_rect()
        self.rect.x = random.randrange(WINDOW_WIDTH - self.rect.width)
        self.rect.y = random.randrange(-100, -40)
        self.speedy = random.randrange(1, 4)
        self.engine_particles = []

    def update(self):
        self.rect.y += self.speedy
        if self.rect.top > WINDOW_HEIGHT + 10:
            self.rect.x = random.randrange(WINDOW_WIDTH - self.rect.width)
            self.rect.y = random.randrange(-100, -40)
            self.speedy = random.randrange(1, 4)
        
        if self.boss:
            now = pygame.time.get_ticks()
            if now - self.last_shot > self.shoot_delay:
                self.last_shot = now
                bullet = EnemyBullet(self.rect.centerx, self.rect.bottom)
                all_sprites.add(bullet)
                enemy_bullets.add(bullet)

        # Add engine particles for boss
        if self.boss and random.random() < 0.2:
            self.engine_particles.append({
                'x': self.rect.centerx + random.randint(-20, 20),
                'y': self.rect.bottom,
                'speed': random.randint(1, 3),
                'size': random.randint(3, 6)
            })

        # Update engine particles
        for particle in self.engine_particles[:]:
            particle['y'] += particle['speed']
            if particle['y'] > WINDOW_HEIGHT:
                self.engine_particles.remove(particle)

    def draw(self, surface):
        # Draw engine particles
        for particle in self.engine_particles:
            pygame.draw.circle(surface, RED, 
                             (int(particle['x']), int(particle['y'])), 
                             particle['size'])
        surface.blit(self.image, self.rect)

class EnemyBullet(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((10, 20), pygame.SRCALPHA)
        pygame.draw.rect(self.image, RED, (0, 0, 10, 20))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.top = y
        self.speedy = 5
        self.trail_particles = []

    def update(self):
        self.rect.y += self.speedy
        if self.rect.top > WINDOW_HEIGHT:
            self.kill()

        # Add trail particles
        if random.random() < 0.3:
            self.trail_particles.append({
                'x': self.rect.centerx + random.randint(-2, 2),
                'y': self.rect.bottom,
                'speed': random.randint(1, 3),
                'size': random.randint(1, 2)
            })

        # Update trail particles
        for particle in self.trail_particles[:]:
            particle['y'] += particle['speed']
            if particle['y'] > WINDOW_HEIGHT:
                self.trail_particles.remove(particle)

    def draw(self, surface):
        # Draw trail particles
        for particle in self.trail_particles:
            pygame.draw.circle(surface, RED, 
                             (int(particle['x']), int(particle['y'])), 
                             particle['size'])
        surface.blit(self.image, self.rect)

class Bullet(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((5, 10), pygame.SRCALPHA)
        pygame.draw.rect(self.image, WHITE, (0, 0, 5, 10))
        self.rect = self.image.get_rect()
        self.rect.centerx = x
        self.rect.bottom = y
        self.speedy = -10
        self.speedx = 0
        self.trail_particles = []

    def update(self):
        self.rect.y += self.speedy
        self.rect.x += self.speedx
        if self.rect.bottom < 0 or self.rect.right < 0 or self.rect.left > WINDOW_WIDTH:
            self.kill()

        # Add trail particles
        if random.random() < 0.3:
            self.trail_particles.append({
                'x': self.rect.centerx + random.randint(-2, 2),
                'y': self.rect.bottom,
                'speed': random.randint(1, 3),
                'size': random.randint(1, 2)
            })

        # Update trail particles
        for particle in self.trail_particles[:]:
            particle['y'] += particle['speed']
            if particle['y'] > WINDOW_HEIGHT:
                self.trail_particles.remove(particle)

    def draw(self, surface):
        # Draw trail particles
        for particle in self.trail_particles:
            pygame.draw.circle(surface, WHITE, 
                             (int(particle['x']), int(particle['y'])), 
                             particle['size'])
        surface.blit(self.image, self.rect)

class PowerUp(pygame.sprite.Sprite):
    def __init__(self, center):
        super().__init__()
        self.type = random.choice(['shield', 'gun', 'life', 'speed', 'rapid_fire', 'spread'])
        if self.type == 'shield':
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, GREEN, (10, 10), 10)
        elif self.type == 'gun':
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, YELLOW, (10, 10), 10)
        elif self.type == 'life':
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, RED, (10, 10), 10)
        elif self.type == 'speed':
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, BLUE, (10, 10), 10)
        elif self.type == 'rapid_fire':
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, PURPLE, (10, 10), 10)
        else:  # spread
            self.image = pygame.Surface((20, 20), pygame.SRCALPHA)
            pygame.draw.circle(self.image, ORANGE, (10, 10), 10)
        self.rect = self.image.get_rect()
        self.rect.center = center
        self.speedy = 3
        self.angle = 0
        self.rotation_speed = 2

    def update(self):
        self.rect.y += self.speedy
        if self.rect.top > WINDOW_HEIGHT:
            self.kill()
        
        # Rotate the power-up
        self.angle = (self.angle + self.rotation_speed) % 360
        self.image = pygame.transform.rotate(self.image, self.rotation_speed)
        self.rect = self.image.get_rect(center=self.rect.center)

class Explosion(pygame.sprite.Sprite):
    def __init__(self, center, size):
        super().__init__()
        self.size = size
        self.image = pygame.Surface((size, size), pygame.SRCALPHA)
        pygame.draw.circle(self.image, YELLOW, (size//2, size//2), size//2)
        self.rect = self.image.get_rect()
        self.rect.center = center
        self.frame = 0
        self.last_update = pygame.time.get_ticks()
        self.frame_rate = 50
        self.particles = []

    def update(self):
        now = pygame.time.get_ticks()
        if now - self.last_update > self.frame_rate:
            self.last_update = now
            self.frame += 1
            if self.frame == 8:
                self.kill()
            else:
                center = self.rect.center
                self.image = pygame.Surface((self.size, self.size), pygame.SRCALPHA)
                pygame.draw.circle(self.image, YELLOW, (self.size//2, self.size//2), 
                                 self.size//2 - self.frame)
                self.rect = self.image.get_rect()
                self.rect.center = center

        # Add explosion particles
        if self.frame < 4:
            for _ in range(3):
                angle = random.uniform(0, 2 * math.pi)
                speed = random.uniform(2, 5)
                self.particles.append({
                    'x': self.rect.centerx,
                    'y': self.rect.centery,
                    'dx': math.cos(angle) * speed,
                    'dy': math.sin(angle) * speed,
                    'size': random.randint(2, 4),
                    'life': 20
                })

        # Update particles
        for particle in self.particles[:]:
            particle['x'] += particle['dx']
            particle['y'] += particle['dy']
            particle['life'] -= 1
            if particle['life'] <= 0:
                self.particles.remove(particle)

    def draw(self, surface):
        # Draw explosion particles
        for particle in self.particles:
            alpha = int((particle['life'] / 20) * 255)
            color = (255, 255, 0, alpha)
            pygame.draw.circle(surface, color, 
                             (int(particle['x']), int(particle['y'])), 
                             particle['size'])
        surface.blit(self.image, self.rect)

class Star:
    def __init__(self):
        self.x = random.randint(0, WINDOW_WIDTH)
        self.y = random.randint(0, WINDOW_HEIGHT)
        self.size = random.randint(1, 3)
        self.speed = random.uniform(0.5, 2)
        self.brightness = random.randint(100, 255)

    def update(self):
        self.y += self.speed
        if self.y > WINDOW_HEIGHT:
            self.y = 0
            self.x = random.randint(0, WINDOW_WIDTH)

    def draw(self, surface):
        color = (self.brightness, self.brightness, self.brightness)
        pygame.draw.circle(surface, color, (int(self.x), int(self.y)), self.size)

# Sprite groups
all_sprites = pygame.sprite.Group()
enemies = pygame.sprite.Group()
bullets = pygame.sprite.Group()
enemy_bullets = pygame.sprite.Group()
powerups = pygame.sprite.Group()
explosions = pygame.sprite.Group()

# Create player
player = Player()
all_sprites.add(player)

# Create enemies
for i in range(8):
    enemy = Enemy()
    all_sprites.add(enemy)
    enemies.add(enemy)

# Create stars for background
stars = [Star() for _ in range(100)]

# Game variables
score = 0
high_score = load_high_score()
level = 1
boss_spawn_score = 5000
running = True
game_over = False
paused = False

def draw_text(surf, text, size, x, y, color=WHITE):
    font = pygame.font.Font(None, size)
    text_surface = font.render(text, True, color)
    text_rect = text_surface.get_rect()
    text_rect.midtop = (x, y)
    surf.blit(text_surface, text_rect)

def draw_health_bar(surf, x, y, pct):
    if pct < 0:
        pct = 0
    BAR_LENGTH = 100
    BAR_HEIGHT = 10
    fill = (pct / 100) * BAR_LENGTH
    outline_rect = pygame.Rect(x, y, BAR_LENGTH, BAR_HEIGHT)
    fill_rect = pygame.Rect(x, y, fill, BAR_HEIGHT)
    pygame.draw.rect(surf, GREEN, fill_rect)
    pygame.draw.rect(surf, WHITE, outline_rect, 2)

def show_pause_screen():
    screen.fill(BLACK)
    draw_text(screen, "PAUSED", 64, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 4)
    draw_text(screen, "Press P to continue", 24, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2)
    pygame.display.flip()

def show_game_over_screen():
    screen.fill(BLACK)
    draw_text(screen, "GAME OVER", 64, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 4)
    draw_text(screen, f"Score: {score}", 36, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2)
    draw_text(screen, f"High Score: {high_score}", 36, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 40)
    draw_text(screen, "Press SPACE to restart", 24, WINDOW_WIDTH / 2, WINDOW_HEIGHT * 3 / 4)
    pygame.display.flip()
    waiting = True
    while waiting:
        clock.tick(FPS)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return False
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_SPACE:
                    waiting = False
    return True

# Start background music
play_background_music()

# Game loop
while running:
    # Keep loop running at the right speed
    clock.tick(FPS)
    
    # Process input/events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_p:
                paused = not paused

    if not game_over and not paused:
        # Update
        all_sprites.update()

        # Update stars
        for star in stars:
            star.update()

        # Check bullet-enemy collisions
        hits = pygame.sprite.groupcollide(enemies, bullets, False, True)
        for enemy, bullet_list in hits.items():
            enemy.health -= len(bullet_list)
            if enemy.health <= 0:
                score += enemy.score
                if score > high_score:
                    high_score = score
                    save_high_score(high_score)
                
                # Create explosion
                explosion = Explosion(enemy.rect.center, enemy.rect.width)
                all_sprites.add(explosion)
                explosions.add(explosion)
                
                enemy.kill()
                # Spawn power-up with 30% chance
                if random.random() > 0.7:
                    powerup = PowerUp(enemy.rect.center)
                    all_sprites.add(powerup)
                    powerups.add(powerup)
                # Spawn new enemy
                if not enemy.boss:
                    enemy = Enemy()
                    all_sprites.add(enemy)
                    enemies.add(enemy)

        # Check player-enemy collisions
        hits = pygame.sprite.spritecollide(player, enemies, True)
        for hit in hits:
            if player.shield > 0 or player.invincible:
                continue
            player.health -= 20
            explosion = Explosion(hit.rect.center, hit.rect.width)
            all_sprites.add(explosion)
            explosions.add(explosion)
            enemy = Enemy()
            all_sprites.add(enemy)
            enemies.add(enemy)
            if player.health <= 0:
                player.lives -= 1
                player.health = 100
                player.invincible = True
                player.invincible_time = pygame.time.get_ticks()
                if player.lives <= 0:
                    game_over = True

        # Check player-enemy bullet collisions
        hits = pygame.sprite.spritecollide(player, enemy_bullets, True)
        for hit in hits:
            if player.shield > 0 or player.invincible:
                continue
            player.health -= 10
            explosion = Explosion(hit.rect.center, hit.rect.width)
            all_sprites.add(explosion)
            explosions.add(explosion)
            if player.health <= 0:
                player.lives -= 1
                player.health = 100
                player.invincible = True
                player.invincible_time = pygame.time.get_ticks()
                if player.lives <= 0:
                    game_over = True

        # Check player-powerup collisions
        hits = pygame.sprite.spritecollide(player, powerups, True)
        for hit in hits:
            if hit.type == 'shield':
                player.shield = 1
                player.shield_time = pygame.time.get_ticks()
            elif hit.type == 'gun':
                player.power = 2
                player.power_time = pygame.time.get_ticks()
            elif hit.type == 'life':
                player.lives = min(player.lives + 1, 5)
            elif hit.type == 'speed':
                player.speed = min(player.speed + 2, 12)
            elif hit.type == 'rapid_fire':
                player.rapid_fire = True
                player.rapid_fire_time = pygame.time.get_ticks()
            elif hit.type == 'spread':
                player.spread_shot = True
                player.spread_shot_time = pygame.time.get_ticks()

        # Spawn boss
        if score >= boss_spawn_score and not any(enemy.boss for enemy in enemies):
            boss = Enemy(boss=True)
            all_sprites.add(boss)
            enemies.add(boss)
            boss_spawn_score += 5000

        # Draw / render
        screen.fill(BLACK)
        
        # Draw stars
        for star in stars:
            star.draw(screen)
        
        # Draw all sprites
        for sprite in all_sprites:
            sprite.draw(screen)
        
        # Draw score
        draw_text(screen, f"Score: {score}", 18, WINDOW_WIDTH / 2, 10)
        draw_text(screen, f"High Score: {high_score}", 18, WINDOW_WIDTH - 100, 10)
        
        # Draw health bar
        draw_health_bar(screen, 5, 5, player.health)
        
        # Draw lives
        draw_text(screen, "Lives: " + str(player.lives), 18, WINDOW_WIDTH - 60, 5)

        # Draw shield indicator
        if player.shield > 0:
            pygame.draw.circle(screen, GREEN, (30, 30), 15, 2)
        
        # After drawing everything, flip the display
        pygame.display.flip()
    elif paused:
        show_pause_screen()
    else:
        if not show_game_over_screen():
            running = False
        else:
            # Reset game
            all_sprites = pygame.sprite.Group()
            enemies = pygame.sprite.Group()
            bullets = pygame.sprite.Group()
            enemy_bullets = pygame.sprite.Group()
            powerups = pygame.sprite.Group()
            explosions = pygame.sprite.Group()
            
            player = Player()
            all_sprites.add(player)
            
            for i in range(8):
                enemy = Enemy()
                all_sprites.add(enemy)
                enemies.add(enemy)
            
            score = 0
            game_over = False

pygame.quit() 