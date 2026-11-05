#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

// Run from repository root: node backend/scaffold.mjs
// Generates 15 separate Express services without modifying existing frontend apps.
const root = path.resolve("backend");
const services = [
["identity-access","Identity & Access",4101,"/api/v1/identity","identity_access",["CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email VARCHAR(255) UNIQUE,phone VARCHAR(32) UNIQUE,password_hash TEXT NOT NULL,display_name VARCHAR(160) NOT NULL,status VARCHAR(24) NOT NULL DEFAULT 'PENDING');","CREATE TABLE roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),code VARCHAR(60) UNIQUE NOT NULL,name VARCHAR(100) NOT NULL);","CREATE TABLE permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),code VARCHAR(100) UNIQUE NOT NULL,description TEXT);","CREATE TABLE user_roles (user_id UUID NOT NULL,role_id UUID NOT NULL REFERENCES roles(id),PRIMARY KEY(user_id,role_id));","CREATE TABLE role_permissions (role_id UUID NOT NULL REFERENCES roles(id),permission_id UUID NOT NULL REFERENCES permissions(id),PRIMARY KEY(role_id,permission_id));","CREATE TABLE refresh_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL,token_hash TEXT UNIQUE NOT NULL,expires_at TIMESTAMPTZ NOT NULL,revoked_at TIMESTAMPTZ);"]],
["customer","Customer",4102,"/api/v1/customers","customer",["CREATE TABLE customer_profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),identity_user_id UUID UNIQUE NOT NULL,first_name VARCHAR(100),last_name VARCHAR(100),phone VARCHAR(32),email VARCHAR(255),status VARCHAR(24) DEFAULT 'ACTIVE');","CREATE TABLE customer_addresses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),customer_id UUID REFERENCES customer_profiles(id),label VARCHAR(60),recipient_name VARCHAR(160) NOT NULL,phone VARCHAR(32) NOT NULL,address_line TEXT NOT NULL,landmark TEXT,city VARCHAR(100),state VARCHAR(100),lga VARCHAR(100),country_code CHAR(2) DEFAULT 'NG',latitude NUMERIC(10,7),longitude NUMERIC(10,7),is_default BOOLEAN DEFAULT false,delivery_instructions TEXT);"]],
["vendor-station","Vendor & Station",4103,"/api/v1/vendors","vendor_station",["CREATE TABLE vendors (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),legal_name VARCHAR(200) NOT NULL,trading_name VARCHAR(200),registration_number VARCHAR(100),contact_email VARCHAR(255),contact_phone VARCHAR(32),verification_status VARCHAR(24) DEFAULT 'PENDING',status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE stations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),vendor_id UUID NOT NULL REFERENCES vendors(id),station_code VARCHAR(60) UNIQUE NOT NULL,name VARCHAR(180) NOT NULL,address_line TEXT NOT NULL,city VARCHAR(100),state VARCHAR(100),lga VARCHAR(100),latitude NUMERIC(10,7) NOT NULL,longitude NUMERIC(10,7) NOT NULL,service_radius_km NUMERIC(7,2),operating_hours JSONB DEFAULT '{}'::jsonb,status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE vendor_users (vendor_id UUID REFERENCES vendors(id),identity_user_id UUID NOT NULL,role_code VARCHAR(50) NOT NULL,PRIMARY KEY(vendor_id,identity_user_id));","CREATE INDEX idx_stations_geo ON stations(latitude,longitude);"]],
["product-catalogue","Product Catalogue",4104,"/api/v1/catalogue","product_catalogue",["CREATE TABLE product_categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),parent_id UUID REFERENCES product_categories(id),name VARCHAR(120) NOT NULL,slug VARCHAR(140) UNIQUE NOT NULL,category_type VARCHAR(24) CHECK(category_type IN ('FUEL','MERCHANDISE','SERVICE')),active BOOLEAN DEFAULT true);","CREATE TABLE products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),category_id UUID REFERENCES product_categories(id),sku VARCHAR(80) UNIQUE NOT NULL,name VARCHAR(180) NOT NULL,description TEXT,product_type VARCHAR(24) CHECK(product_type IN ('FUEL','MERCHANDISE','SERVICE')),unit_of_measure VARCHAR(24) NOT NULL,is_hazardous BOOLEAN DEFAULT false,attributes JSONB DEFAULT '{}'::jsonb,active BOOLEAN DEFAULT true);","CREATE TABLE product_images (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),product_id UUID REFERENCES products(id) ON DELETE CASCADE,url TEXT NOT NULL,alt_text VARCHAR(255),sort_order INTEGER DEFAULT 0);"]],
["inventory-tank","Inventory & Tank",4105,"/api/v1/inventory","inventory_tank",["CREATE TABLE fuel_tanks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),station_id UUID NOT NULL,product_id UUID NOT NULL,tank_code VARCHAR(60) NOT NULL,capacity_litres NUMERIC(14,3) CHECK(capacity_litres>0),status VARCHAR(24) DEFAULT 'ACTIVE',UNIQUE(station_id,tank_code));","CREATE TABLE inventory_balances (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),station_id UUID NOT NULL,product_id UUID NOT NULL,on_hand NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(on_hand>=0),reserved NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK(reserved>=0),reorder_level NUMERIC(14,3) DEFAULT 0,updated_at TIMESTAMPTZ DEFAULT now(),UNIQUE(station_id,product_id));","CREATE TABLE stock_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),station_id UUID NOT NULL,product_id UUID NOT NULL,tank_id UUID REFERENCES fuel_tanks(id),movement_type VARCHAR(30) NOT NULL,quantity NUMERIC(14,3) CHECK(quantity>0),reference_type VARCHAR(40),reference_id UUID,notes TEXT,created_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE stock_reservations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),station_id UUID NOT NULL,product_id UUID NOT NULL,order_id UUID NOT NULL,quantity NUMERIC(14,3) CHECK(quantity>0),status VARCHAR(20) DEFAULT 'ACTIVE',expires_at TIMESTAMPTZ NOT NULL,UNIQUE(order_id,product_id,station_id));","CREATE TABLE tank_readings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tank_id UUID REFERENCES fuel_tanks(id),reading_type VARCHAR(24),volume_litres NUMERIC(14,3),measured_at TIMESTAMPTZ NOT NULL,recorded_by UUID);"]],
["pricing-quotation","Pricing & Quotation",4106,"/api/v1/pricing","pricing_quotation",["CREATE TABLE price_books (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name VARCHAR(120) NOT NULL,station_id UUID,vendor_id UUID,customer_type VARCHAR(24) DEFAULT 'RETAIL',currency CHAR(3) DEFAULT 'NGN',valid_from TIMESTAMPTZ NOT NULL,valid_until TIMESTAMPTZ,active BOOLEAN DEFAULT true);","CREATE TABLE product_prices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),price_book_id UUID REFERENCES price_books(id),product_id UUID NOT NULL,unit_price_kobo BIGINT CHECK(unit_price_kobo>=0),minimum_quantity NUMERIC(14,3) DEFAULT 0,UNIQUE(price_book_id,product_id));","CREATE TABLE delivery_rates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),zone_code VARCHAR(60),delivery_mode VARCHAR(30),vehicle_class VARCHAR(40),base_fee_kobo BIGINT DEFAULT 0,per_km_kobo BIGINT DEFAULT 0,active BOOLEAN DEFAULT true);","CREATE TABLE quotations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),customer_id UUID NOT NULL,station_id UUID,currency CHAR(3) DEFAULT 'NGN',subtotal_kobo BIGINT NOT NULL,delivery_fee_kobo BIGINT DEFAULT 0,discount_kobo BIGINT DEFAULT 0,total_kobo BIGINT NOT NULL,status VARCHAR(24) DEFAULT 'OPEN',expires_at TIMESTAMPTZ NOT NULL);","CREATE TABLE quotation_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),quotation_id UUID REFERENCES quotations(id),product_id UUID NOT NULL,quantity NUMERIC(14,3),unit_price_kobo BIGINT,line_total_kobo BIGINT);"]],
["cart-checkout","Cart & Checkout",4107,"/api/v1/cart","cart_checkout",["CREATE TABLE carts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),customer_id UUID NOT NULL,status VARCHAR(20) DEFAULT 'ACTIVE',currency CHAR(3) DEFAULT 'NGN',updated_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE cart_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,product_id UUID NOT NULL,station_id UUID,quantity NUMERIC(14,3) CHECK(quantity>0),unit_of_measure VARCHAR(24),UNIQUE(cart_id,product_id,station_id));","CREATE TABLE checkout_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),cart_id UUID REFERENCES carts(id),customer_id UUID NOT NULL,quotation_id UUID,delivery_address_id UUID NOT NULL,status VARCHAR(24) DEFAULT 'STARTED',idempotency_key VARCHAR(120) UNIQUE,expires_at TIMESTAMPTZ);"]],
["order-management","Order Management",4108,"/api/v1/orders","order_management",["CREATE TABLE orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_number VARCHAR(40) UNIQUE NOT NULL,customer_id UUID NOT NULL,quotation_id UUID,currency CHAR(3) DEFAULT 'NGN',subtotal_kobo BIGINT NOT NULL,delivery_fee_kobo BIGINT DEFAULT 0,discount_kobo BIGINT DEFAULT 0,total_kobo BIGINT NOT NULL,payment_status VARCHAR(24) DEFAULT 'PENDING',order_status VARCHAR(32) DEFAULT 'PENDING_PAYMENT',delivery_address_snapshot JSONB NOT NULL,created_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE order_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID REFERENCES orders(id),product_id UUID NOT NULL,station_id UUID,product_name_snapshot VARCHAR(180),quantity NUMERIC(14,3),unit_of_measure VARCHAR(24),unit_price_kobo BIGINT,line_total_kobo BIGINT,delivered_quantity NUMERIC(14,3));","CREATE TABLE shipments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID REFERENCES orders(id),fulfilment_type VARCHAR(30),station_id UUID,required_delivery_capability VARCHAR(40) NOT NULL,status VARCHAR(30) DEFAULT 'PENDING');","CREATE TABLE order_status_history (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID REFERENCES orders(id),from_status VARCHAR(32),to_status VARCHAR(32) NOT NULL,note TEXT,actor_id UUID,created_at TIMESTAMPTZ DEFAULT now());"]],
["payment-financial","Payment & Financial",4109,"/api/v1/payments","payment_financial",["CREATE TABLE payment_transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),order_id UUID NOT NULL,customer_id UUID NOT NULL,provider VARCHAR(40),provider_reference VARCHAR(140) UNIQUE,idempotency_key VARCHAR(120) UNIQUE NOT NULL,amount_kobo BIGINT CHECK(amount_kobo>0),currency CHAR(3) DEFAULT 'NGN',status VARCHAR(24) DEFAULT 'PENDING',provider_payload JSONB);","CREATE TABLE payment_webhook_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),provider VARCHAR(40),event_reference VARCHAR(160),payload JSONB,processed_at TIMESTAMPTZ,UNIQUE(provider,event_reference));","CREATE TABLE refunds (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),payment_id UUID REFERENCES payment_transactions(id),amount_kobo BIGINT CHECK(amount_kobo>0),reason TEXT,provider_reference VARCHAR(140),status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE ledger_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),account_code VARCHAR(60) UNIQUE,owner_type VARCHAR(30),owner_id UUID,currency CHAR(3) DEFAULT 'NGN');","CREATE TABLE ledger_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),journal_reference UUID NOT NULL,account_id UUID REFERENCES ledger_accounts(id),direction VARCHAR(6) CHECK(direction IN ('DEBIT','CREDIT')),amount_kobo BIGINT CHECK(amount_kobo>0),description TEXT,created_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE vendor_settlements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),vendor_id UUID,period_start DATE,period_end DATE,gross_kobo BIGINT,commission_kobo BIGINT,net_kobo BIGINT,status VARCHAR(24) DEFAULT 'PENDING');"]],
["logistics-dispatch","Logistics & Dispatch",4110,"/api/v1/logistics","logistics_dispatch",["CREATE TABLE delivery_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),shipment_id UUID UNIQUE NOT NULL,delivery_type VARCHAR(30),required_capability VARCHAR(40) NOT NULL,pickup_station_id UUID,dropoff_address_snapshot JSONB,priority VARCHAR(20) DEFAULT 'NORMAL',status VARCHAR(30) DEFAULT 'PENDING_DISPATCH',scheduled_for TIMESTAMPTZ);","CREATE TABLE delivery_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),delivery_job_id UUID REFERENCES delivery_jobs(id),rider_id UUID NOT NULL,vehicle_id UUID NOT NULL,assigned_at TIMESTAMPTZ DEFAULT now(),accepted_at TIMESTAMPTZ,released_at TIMESTAMPTZ,status VARCHAR(24) DEFAULT 'OFFERED');","CREATE TABLE dispatch_policies (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name VARCHAR(120),delivery_type VARCHAR(30),required_capability VARCHAR(40),max_distance_km NUMERIC(8,2),enabled BOOLEAN DEFAULT true);"]],
["rider-fleet","Rider & Fleet",4111,"/api/v1/riders","rider_fleet",["CREATE TABLE riders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),identity_user_id UUID UNIQUE NOT NULL,rider_type VARCHAR(30) DEFAULT 'COURIER',verification_status VARCHAR(24) DEFAULT 'PENDING',availability_status VARCHAR(24) DEFAULT 'OFFLINE',rating NUMERIC(3,2));","CREATE TABLE vehicles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),owner_rider_id UUID REFERENCES riders(id),vehicle_type VARCHAR(40),registration_number VARCHAR(40) UNIQUE,capacity_value NUMERIC(14,3),capacity_unit VARCHAR(24),status VARCHAR(24) DEFAULT 'PENDING',inspection_expires_at DATE,insurance_expires_at DATE);","CREATE TABLE vehicle_capabilities (vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,capability_code VARCHAR(50),approval_status VARCHAR(24) DEFAULT 'PENDING',PRIMARY KEY(vehicle_id,capability_code));","CREATE TABLE rider_documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),rider_id UUID REFERENCES riders(id),document_type VARCHAR(40),document_url TEXT,expires_at DATE,verification_status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE rider_shifts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),rider_id UUID REFERENCES riders(id),started_at TIMESTAMPTZ,ended_at TIMESTAMPTZ,status VARCHAR(20) DEFAULT 'ACTIVE');","CREATE TABLE rider_earnings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),rider_id UUID REFERENCES riders(id),delivery_id UUID,gross_kobo BIGINT,adjustment_kobo BIGINT DEFAULT 0,status VARCHAR(24) DEFAULT 'PENDING');"]],
["tracking-routing","Tracking & Routing",4112,"/api/v1/tracking","tracking_routing",["CREATE TABLE tracking_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),delivery_id UUID,actor_id UUID,latitude NUMERIC(10,7) NOT NULL,longitude NUMERIC(10,7) NOT NULL,accuracy_metres NUMERIC(8,2),speed_kph NUMERIC(8,2),heading NUMERIC(6,2),recorded_at TIMESTAMPTZ,received_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE route_estimates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),delivery_id UUID,provider VARCHAR(40),distance_metres BIGINT,duration_seconds BIGINT,encoded_polyline TEXT,calculated_at TIMESTAMPTZ DEFAULT now());","CREATE TABLE geofences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name VARCHAR(120),fence_type VARCHAR(30),centre_lat NUMERIC(10,7),centre_lng NUMERIC(10,7),radius_metres NUMERIC(12,2),active BOOLEAN DEFAULT true);","CREATE INDEX idx_tracking_delivery_time ON tracking_events(delivery_id,recorded_at DESC);"]],
["corporate-contracts","Corporate & Contracts",4113,"/api/v1/corporate","corporate_contracts",["CREATE TABLE corporate_accounts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),legal_name VARCHAR(200),registration_number VARCHAR(100),billing_email VARCHAR(255),billing_phone VARCHAR(32),status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE corporate_users (corporate_account_id UUID REFERENCES corporate_accounts(id),identity_user_id UUID,role_code VARCHAR(40),PRIMARY KEY(corporate_account_id,identity_user_id));","CREATE TABLE contracts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),corporate_account_id UUID REFERENCES corporate_accounts(id),contract_number VARCHAR(80) UNIQUE,starts_on DATE,ends_on DATE,payment_terms VARCHAR(40),credit_limit_kobo BIGINT DEFAULT 0,status VARCHAR(24) DEFAULT 'DRAFT');","CREATE TABLE contract_prices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),contract_id UUID REFERENCES contracts(id),product_id UUID,unit_price_kobo BIGINT CHECK(unit_price_kobo>=0));","CREATE TABLE recurring_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),contract_id UUID REFERENCES contracts(id),frequency VARCHAR(20),next_run_at TIMESTAMPTZ,order_template JSONB,active BOOLEAN DEFAULT true);"]],
["compliance-safety","Compliance & Safety",4114,"/api/v1/compliance","compliance_safety",["CREATE TABLE compliance_documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),subject_type VARCHAR(30),subject_id UUID,document_type VARCHAR(60),document_number VARCHAR(120),issuer VARCHAR(160),document_url TEXT,issued_on DATE,expires_on DATE,status VARCHAR(24) DEFAULT 'PENDING',verified_by UUID,verified_at TIMESTAMPTZ);","CREATE TABLE permits (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),subject_type VARCHAR(30),subject_id UUID,authority VARCHAR(160),permit_type VARCHAR(80),permit_number VARCHAR(120),expires_on DATE,status VARCHAR(24) DEFAULT 'PENDING');","CREATE TABLE vehicle_inspections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),vehicle_id UUID,inspection_type VARCHAR(60),inspected_on DATE,expires_on DATE,result VARCHAR(24),report_url TEXT);","CREATE TABLE safety_incidents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),incident_type VARCHAR(60),severity VARCHAR(24),subject_type VARCHAR(30),subject_id UUID,delivery_id UUID,description TEXT,occurred_at TIMESTAMPTZ,reported_by UUID,status VARCHAR(24) DEFAULT 'OPEN');"]],
["notification-communications","Notification & Communications",4115,"/api/v1/notifications","notification_communications",["CREATE TABLE notification_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),identity_user_id UUID,channel VARCHAR(24),event_code VARCHAR(100),enabled BOOLEAN DEFAULT true,UNIQUE(identity_user_id,channel,event_code));","CREATE TABLE notification_templates (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),event_code VARCHAR(100),channel VARCHAR(24),locale VARCHAR(12) DEFAULT 'en-NG',subject_template TEXT,body_template TEXT,active BOOLEAN DEFAULT true,UNIQUE(event_code,channel,locale));","CREATE TABLE notification_deliveries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),identity_user_id UUID,recipient VARCHAR(255),channel VARCHAR(24),event_code VARCHAR(100),payload JSONB DEFAULT '{}'::jsonb,provider VARCHAR(40),provider_reference VARCHAR(160),status VARCHAR(24) DEFAULT 'QUEUED',attempts INTEGER DEFAULT 0,scheduled_at TIMESTAMPTZ DEFAULT now(),sent_at TIMESTAMPTZ,last_error TEXT);","CREATE INDEX idx_notification_queue ON notification_deliveries(status,scheduled_at);"]]
];

function write(rel, value) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value.endsWith("\n") ? value : value + "\n", "utf8");
}
write("README.md", [
"# PERN Fuel Commerce & Logistics — 15 Microservices",
"",
"This generator creates fifteen independently deployable Node.js + Express + PostgreSQL services. Existing frontend folders are not overwritten.",
"",
...services.map((s,i)=>(i+1)+". "+s[1]+" — "+s[0]+" — port "+s[2]+" — "+s[3]),
"",
"## Generate and run from repository root",
"node backend/scaffold.mjs",
"cd backend",
"cp .env.example .env",
"docker compose up --build",
"",
"Gateway: http://localhost:8080. RabbitMQ management: http://localhost:15672. PostgreSQL: localhost:5432.",
"",
"Each service owns its own PostgreSQL database. The local setup uses one PostgreSQL server with 15 databases and 15 database roles. Cross-service references are UUIDs, not foreign keys. REST handles synchronous calls and RabbitMQ handles domain events. Amounts use integer kobo. Production requires managed secrets, TLS, idempotency, transactional outbox/inbox, dead-letter queues, observability and independent backups.",
"",
"This is a deployable infrastructure and initial schema foundation. Domain endpoints, provider integrations, frontend conversion and end-to-end tests are follow-on implementation increments."
].join("\n"));
write(".env.example", [
"POSTGRES_USER=platform_admin",
"POSTGRES_PASSWORD=local_dev_only_change_me",
"RABBITMQ_DEFAULT_USER=fuel_dev",
"RABBITMQ_DEFAULT_PASS=fuel_dev_only_change_me",
"JWT_ACCESS_SECRET=local_access_secret_change_before_deployment"
].join("\n"));
write(".gitignore","node_modules/\n.env\n.env.*\n!.env.example\ncoverage/\ndist/\n*.log\n");

write("packages/event-bus/package.json",JSON.stringify({
name:"@fuel-platform/event-bus",version:"1.0.0",private:true,type:"module",
main:"index.js",exports:"./index.js",dependencies:{amqplib:"^0.10.5"}
},null,2));
write("packages/event-bus/index.js",[
'import amqp from "amqplib";',
'import { randomUUID } from "node:crypto";',
'const EXCHANGE="fuel-platform.events"; let connection; let channel;',
"export async function connectEventBus(url=process.env.AMQP_URL){if(channel)return channel;connection=await amqp.connect(url);connection.on('close',()=>{channel=undefined;connection=undefined;});channel=await connection.createConfirmChannel();await channel.assertExchange(EXCHANGE,'topic',{durable:true});return channel;}",
"export const eventBusReady=()=>Boolean(channel);",
"export async function publishEvent(eventType,data,metadata={}){if(!channel)throw new Error('Event bus is not connected');const envelope={eventId:randomUUID(),eventType,occurredAt:new Date().toISOString(),source:process.env.SERVICE_NAME,data,metadata};channel.publish(EXCHANGE,eventType,Buffer.from(JSON.stringify(envelope)),{persistent:true,contentType:'application/json',messageId:envelope.eventId});await channel.waitForConfirms();return envelope.eventId;}",
"export async function subscribeEvent(queueName,routingKey,handler){if(!channel)throw new Error('Event bus is not connected');await channel.assertQueue(queueName,{durable:true});await channel.bindQueue(queueName,EXCHANGE,routingKey);await channel.prefetch(10);await channel.consume(queueName,async msg=>{if(!msg)return;try{await handler(JSON.parse(msg.content.toString('utf8')));channel.ack(msg);}catch{channel.nack(msg,false,false);}});}",
"export async function closeEventBus(){if(channel)await channel.close().catch(()=>{});if(connection)await connection.close().catch(()=>{});channel=undefined;connection=undefined;}"
].join("\n"));

write("infra/postgres/init/01-create-service-databases.sql",services.map(s=>
"CREATE ROLE "+s[4]+"_user LOGIN PASSWORD 'dev_"+s[4]+"_password';\nCREATE DATABASE "+s[4]+"_db OWNER "+s[4]+"_user;"
).join("\n"));

const dollar = "$";
const compose = [
"services:",
"  postgres:",
"    image: postgres:16-alpine",
"    restart: unless-stopped",
"    environment:",
"      POSTGRES_DB: fuel_platform",
"      POSTGRES_USER: "+dollar+"{POSTGRES_USER:-platform_admin}",
"      POSTGRES_PASSWORD: "+dollar+"{POSTGRES_PASSWORD:-local_dev_only_change_me}",
'    ports: ["5432:5432"]',
"    volumes: [postgres_data:/var/lib/postgresql/data, ./infra/postgres/init:/docker-entrypoint-initdb.d:ro]",
"    healthcheck:",
'      test: ["CMD-SHELL","pg_isready -U '+dollar+'{POSTGRES_USER:-platform_admin} -d fuel_platform"]',
"      interval: 5s",
"      timeout: 5s",
"      retries: 20",
"  rabbitmq:",
"    image: rabbitmq:3.13-management-alpine",
"    restart: unless-stopped",
"    environment:",
"      RABBITMQ_DEFAULT_USER: "+dollar+"{RABBITMQ_DEFAULT_USER:-fuel_dev}",
"      RABBITMQ_DEFAULT_PASS: "+dollar+"{RABBITMQ_DEFAULT_PASS:-fuel_dev_only_change_me}",
'    ports: ["5672:5672","15672:15672"]',
"    healthcheck:",
'      test: ["CMD","rabbitmq-diagnostics","-q","ping"]',
"      interval: 10s",
"      timeout: 5s",
"      retries: 20",
"  redis:",
"    image: redis:7-alpine",
"    restart: unless-stopped",
'    ports: ["6379:6379"]',
"    volumes: [redis_data:/data]"
];
for(const s of services){
  compose.push(
    "  "+s[0]+":",
    "    build:",
    "      context: .",
    "      dockerfile: services/"+s[0]+"/Dockerfile",
    "    restart: unless-stopped",
    "    environment:",
    "      NODE_ENV: production",
    "      SERVICE_NAME: "+s[0],
    "      SERVICE_BASE_PATH: "+s[3],
    "      PORT: "+s[2],
    "      DATABASE_URL: postgresql://"+s[4]+"_user:dev_"+s[4]+"_password@postgres:5432/"+s[4]+"_db",
    "      AMQP_URL: amqp://"+dollar+"{RABBITMQ_DEFAULT_USER:-fuel_dev}:"+dollar+"{RABBITMQ_DEFAULT_PASS:-fuel_dev_only_change_me}@rabbitmq:5672",
    "      JWT_ACCESS_SECRET: "+dollar+"{JWT_ACCESS_SECRET:-local_access_secret_change_before_deployment}",
    '    ports: ["'+s[2]+":"+s[2]+'"]',
    "    depends_on:",
    "      postgres: { condition: service_healthy }",
    "      rabbitmq: { condition: service_healthy }"
  );
}
compose.push("  gateway:","    image: nginx:1.27-alpine","    restart: unless-stopped",'    ports: ["8080:80"]','    volumes: ["./gateway/nginx.conf:/etc/nginx/conf.d/default.conf:ro"]',"    depends_on:");
for(const s of services)compose.push("      "+s[0]+": { condition: service_healthy }");
compose.push("volumes:","  postgres_data:","  redis_data:");
write("docker-compose.yml",compose.join("\n"));

const nginx = ["server {","  listen 80;","  server_name _;","  client_max_body_size 15m;","  proxy_http_version 1.1;","  proxy_set_header Host $host;","  proxy_set_header X-Real-IP $remote_addr;","  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;","  proxy_set_header X-Forwarded-Proto $scheme;",
'  location = /health/live { default_type text/plain; return 200 "ok"; }',
...services.flatMap(s=>["  location "+s[3]+"/ { proxy_pass http://"+s[0]+":"+s[2]+"; proxy_read_timeout 60s; }","  location = "+s[3]+" { return 308 "+s[3]+"/; }"]),
"}"];
write("gateway/nginx.conf",nginx.join("\n"));

write("docs/FRONTEND-MIGRATION.md",[
"# Frontend migration map",
"| Existing project | Target function |",
"|---|---|",
"| enatega-multivendor-admin | Platform admin, stations, inventory, pricing, compliance, dispatch and settlements |",
"| enatega-multivendor-web | Customer fuel and product commerce website |",
"| enatega-multivendor-app | Customer Expo mobile app |",
"| enatega-multivendor-restaurant | Fuel station and vendor Expo app |",
"| enatega-multivendor-rider | Rider, courier, approved fuel driver and fleet app |",
"",
"Replace Apollo/GraphQL operations incrementally with REST clients. Keep each app's existing navigation and native integrations where compatible; the apps have differing React/Expo versions, so do not apply a global framework upgrade. Rider assignments must be capability-gated on the server."
].join("\n"));
write("docs/EVENT-CONTRACTS.md",[
"# Event contracts",
"Use RabbitMQ topic exchange fuel-platform.events. Version event names, for example order.created.v1. Envelope: eventId, eventType, occurredAt, source, data, metadata.",
"| Producer | Event examples |",
"| Identity | identity.user_registered.v1 |",
"| Vendor & Station | station.created.v1, vendor.approved.v1 |",
"| Catalogue | catalogue.product_updated.v1 |",
"| Inventory | inventory.stock_reserved.v1 |",
"| Pricing | quotation.created.v1, pricing.price_changed.v1 |",
"| Checkout | checkout.validated.v1 |",
"| Orders | order.created.v1, order.cancelled.v1 |",
"| Payments | payment.succeeded.v1, payment.refunded.v1 |",
"| Logistics | delivery.assigned.v1, delivery.picked_up.v1 |",
"| Rider & Fleet | rider.availability_changed.v1, vehicle.capability_changed.v1 |",
"| Tracking | tracking.location_received.v1 |",
"| Corporate | corporate.contract_activated.v1 |",
"| Compliance | compliance.document_verified.v1, compliance.incident_reported.v1 |",
"| Notifications | notification.sent.v1 |",
"",
"Production publishers and consumers need transactional outbox/inbox, deduplication, bounded retries and dead-letter queues. The included helper is only the connection/publish/subscribe foundation."
].join("\n"));

for(const s of services){
const packageJson={name:"@fuel-platform/"+s[0],version:"1.0.0",private:true,type:"module",scripts:{start:"node src/server.js",dev:"node --watch src/server.js"},dependencies:{"@fuel-platform/event-bus":"file:../packages/event-bus",cors:"^2.8.5",express:"^4.21.2",helmet:"^8.0.0","pino-http":"^10.4.0",pg:"^8.13.1"}};
write("services/"+s[0]+"/package.json",JSON.stringify(packageJson,null,2));
write("services/"+s[0]+"/Dockerfile",["FROM node:22-alpine","ENV NODE_ENV=production","WORKDIR /app","COPY packages/event-bus ./packages/event-bus","COPY services/"+s[0]+"/package.json ./service/package.json","WORKDIR /app/service","RUN npm install --omit=dev","COPY services/"+s[0]+"/src ./src","COPY services/"+s[0]+"/db ./db","EXPOSE "+s[2],'CMD ["npm","start"]'].join("\n"));
write("services/"+s[0]+"/src/server.js",[
'import express from "express";','import cors from "cors";','import helmet from "helmet";','import pinoHttp from "pino-http";','import pg from "pg";','import { connectEventBus,eventBusReady,closeEventBus } from "@fuel-platform/event-bus";',
"const {Pool}=pg; const name='"+s[0]+"'; const port=Number(process.env.PORT||"+s[2]+"); const basePath=process.env.SERVICE_BASE_PATH||'"+s[3]+"';",
"const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:5000});",
"const app=express(); app.disable('x-powered-by'); app.use(helmet()); app.use(cors()); app.use(express.json({limit:'1mb'})); app.use(pinoHttp());",
"app.get('/health/live',(_req,res)=>res.json({status:'ok',service:name}));",
"app.get('/health/ready',async(_req,res)=>{try{await pool.query('SELECT 1');if(!eventBusReady())throw new Error('event bus unavailable');res.json({status:'ready',service:name,database:'ready',eventBus:'ready'});}catch(error){res.status(503).json({status:'not_ready',service:name,error:error.message});}});",
"app.get(basePath,(_req,res)=>res.json({service:name,version:'v1',status:'scaffolded',message:'Runtime is online; implement domain handlers in this bounded context.'}));",
"app.use((error,_req,res,_next)=>{console.error({service:name,error:error.message});res.status(500).json({error:'INTERNAL_SERVER_ERROR'});});",
"let server; async function start(){await pool.query('SELECT 1');await connectEventBus();server=app.listen(port,'0.0.0.0',()=>console.info({service:name,port,basePath},'started'));}",
"async function shutdown(){server?.close();await pool.end().catch(()=>{});await closeEventBus().catch(()=>{});process.exit(0);}",
"process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);start().catch(error=>{console.error({service:name,error:error.message},'startup failed');process.exit(1);});"
].join("\n"));
write("services/"+s[0]+"/db/schema.sql","-- Owned only by "+s[0]+"\nCREATE EXTENSION IF NOT EXISTS pgcrypto;\n"+s[5].join("\n"));
write("services/"+s[0]+"/README.md",[
"# "+s[1]+" Service",
"Port: "+s[2]+" | API prefix: "+s[3]+" | Database: "+s[4]+"_db",
"Apply initial schema after PostgreSQL is ready:",
"docker compose exec -T postgres psql -U "+s[4]+"_user -d "+s[4]+"_db < services/"+s[0]+"/db/schema.sql",
"This runtime exposes liveness/readiness and service-root endpoints. Business handlers, authorization policies, event consumers, validation, migrations and integration tests are subsequent implementation work."
].join("\n"));
}
console.log("Generated "+services.length+" independently deployable PERN services in "+root);
