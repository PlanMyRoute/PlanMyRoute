## Table `user`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `created_at` | `timestamptz` |  |
| `name` | `text` |  Nullable |
| `username` | `text` |  Unique |
| `img` | `text` |  Nullable |
| `id` | `uuid` | Primary |
| `lastname` | `text` |  Nullable |
| `auto_trip_status_update` | `bool` |  |
| `timezone` | `varchar` |  |
| `expo_push_token` | `text` |  Nullable |
| `referral_code` | `text` |  Nullable Unique |
| `email` | `text` |  Nullable |
| `user_type` | `_interest` |  Nullable |
| `bio` | `text` |  Nullable |
| `location` | `varchar` |  Nullable |

## Table `trip`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `name` | `text` |  |
| `start_date` | `date` |  Nullable |
| `end_date` | `date` |  Nullable |
| `n_adults` | `int8` |  Nullable |
| `n_children` | `int8` |  Nullable |
| `n_babies` | `int8` |  Nullable |
| `n_pets` | `int8` |  Nullable |
| `total_price` | `float8` |  Nullable |
| `estimated_price_min` | `float8` |  Nullable |
| `estimated_price_max` | `float8` |  Nullable |
| `status` | `trip_status` |  |
| `circular` | `bool` |  Nullable |
| `additional_comments` | `text` |  Nullable |
| `type` | `_interest` |  |
| `description` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `total_distance_meters` | `int4` |  Nullable |
| `cover_image_url` | `text` |  Nullable |
| `n_elders` | `int4` |  Nullable |
| `generation_status` | `text` |  |
| `start_time` | `text` |  Nullable |
| `end_time` | `text` |  Nullable |

## Table `vehicle`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `brand` | `text` |  Nullable |
| `model` | `text` |  Nullable |
| `type` | `vehicle_type` |  |
| `avg_consumption` | `numeric` |  Nullable |
| `fuel_tank_capacity` | `numeric` |  Nullable |
| `user_id` | `uuid` |  |
| `type_fuel` | `type_fuel` |  Nullable |
| `is_rental` | `bool` |  |

## Table `stop`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `order` | `int4` |  |
| `estimated_arrival` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `type` | `StopType` |  |
| `address` | `text` |  Nullable |
| `coordinates` | `jsonb` |  |
| `photo_url` | `text` |  Nullable |
| `price_level` | `int4` |  Nullable |
| `price_symbol` | `text` |  Nullable |
| `estimated_price` | `text` |  Nullable |
| `place_rating` | `numeric` |  Nullable |
| `place_reviews_count` | `int4` |  Nullable |
| `google_place_id` | `text` |  Nullable |
| `day` | `int4` |  Nullable |
| `position` | `int4` |  Nullable |
| `trip_id` | `int8` |  |
| `distance_to_next_meters` | `float8` |  Nullable |

## Table `activity`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `category` | `text` |  Nullable |
| `entry_price` | `numeric` |  Nullable |
| `estimated_duration_minutes` | `int4` |  Nullable |
| `booking_required` | `bool` |  Nullable |
| `url` | `text` |  Nullable |
| `estimated_price` | `numeric` |  Nullable |

## Table `refuel`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `liters` | `float8` |  Nullable |
| `id` | `int8` | Primary |
| `fuel_type` | `text` |  Nullable |
| `total_cost` | `numeric` |  Nullable |
| `price_per_unit` | `numeric` |  Nullable |
| `station_brand` | `text` |  Nullable |
| `total_price` | `numeric` |  Nullable |

## Table `accommodation`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `url` | `text` |  Nullable |
| `id` | `int8` | Primary |
| `check_in_time` | `time` |  Nullable |
| `check_out_time` | `time` |  Nullable |
| `reservation_code` | `text` |  Nullable |
| `contact` | `text` |  Nullable |
| `nights` | `int2` |  Nullable |
| `estimated_price` | `numeric` |  Nullable |
| `price_per_night` | `numeric` |  Nullable |

## Table `reservation`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `bill` | `text` |  Nullable |
| `status` | `reservation_status` |  Nullable |
| `stop_id` | `int8` |  Nullable |

## Table `travelers`

relation between trips and users

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `trip_id` | `int8` | Primary |
| `user_role` | `collaborator_role` |  |
| `user_id` | `uuid` | Primary |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `content` | `text` |  Nullable |
| `status` | `notification_status` |  |
| `related_trip_id` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  |
| `type` | `notification_type` |  Nullable |
| `action_status` | `notification_action_status` |  Nullable |
| `user_receiver_id` | `uuid` |  |
| `reminder_count` | `int4` |  |

## Table `reservation_attachments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `stop_id` | `int4` |  |
| `file_path` | `text` |  |
| `file_name` | `text` |  |
| `file_type` | `text` |  |
| `file_size` | `int4` |  Nullable |
| `uploaded_by` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `road_trip`

relationship between vehicle and trip

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `id_vehicle` | `int8` | Primary |
| `id_trip` | `int8` | Primary |

## Table `trip_reviews`

Reseñas y valoraciones de viajes finalizados

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `trip_id` | `int4` |  |
| `user_id` | `uuid` |  |
| `rating` | `int4` |  |
| `comment` | `text` |  Nullable |
| `is_public` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

## Table `user_follows`

Tracks which users follow which other users

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `user_id` | `uuid` |  |
| `following_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `trip_status_history`

Audit log of all trip status changes for tracking and analytics

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `trip_id` | `int8` |  |
| `old_status` | `trip_status` |  Nullable |
| `new_status` | `trip_status` |  |
| `changed_by` | `varchar` |  |
| `changed_at` | `timestamptz` |  |
| `reason` | `text` |  Nullable |
| `user_id` | `uuid` |  Nullable |

## Table `subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Unique |
| `status` | `subscription_status` |  Nullable |
| `tier` | `subscription_tier` |  Nullable |
| `current_period_start` | `timestamptz` |  Nullable |
| `current_period_end` | `timestamptz` |  Nullable |
| `is_trial` | `bool` |  Nullable |
| `trial_end` | `timestamptz` |  Nullable |
| `provider_subscription_id` | `text` |  Nullable |
| `cancel_at_period_end` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `stripe_subscription_id` | `varchar` |  Nullable |
| `stripe_customer_id` | `varchar` |  Nullable |

## Table `user_usage`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `ai_trips_generated_month` | `int4` |  Nullable |
| `max_vehicles_allowed` | `int4` |  Nullable |
| `last_reset_date` | `timestamptz` |  Nullable |

## Table `referrals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `referrer_id` | `uuid` |  Nullable |
| `referee_id` | `uuid` |  Nullable |
| `status` | `text` |  Nullable |
| `reward_granted` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `promo_codes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `code` | `text` | Primary |
| `duration_days` | `int4` |  |
| `max_uses` | `int4` |  Nullable |
| `used_count` | `int4` |  Nullable |
| `expiration_date` | `timestamptz` |  Nullable |
| `is_active` | `bool` |  Nullable |

## Table `trip_photos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `trip_id` | `int8` |  |
| `user_id` | `uuid` |  Nullable |
| `path` | `text` |  |
| `url` | `text` |  Nullable |
| `filename` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `promo_code_usages`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `code` | `text` |  |
| `used_at` | `timestamptz` |  Nullable |

## Table `event_chat_message`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `ticketmaster_event_id` | `text` |  |
| `user_id` | `uuid` |  |
| `message` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `token_wallet`

Saldo de tokens de IA por usuario (cache). Ledger = token_transaction.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `balance` | `int4` |  |
| `updated_at` | `timestamptz` |  |

## Table `token_transaction`

Histórico inmutable de movimientos de tokens (auditoría).

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `type` | `token_transaction_type` |  |
| `amount` | `int4` |  |
| `balance_after` | `int4` |  |
| `reference` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `ai_generation_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary |
| `trip_id` | `int8` |  Nullable |
| `user_id` | `uuid` |  Nullable |
| `model` | `text` |  |
| `latency_ms` | `int4` |  |
| `prompt_tokens` | `int4` |  Nullable |
| `completion_tokens` | `int4` |  Nullable |
| `total_tokens` | `int4` |  Nullable |
| `outcome` | `text` |  |
| `quality_flags` | `jsonb` |  Nullable |
| `error_message` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

