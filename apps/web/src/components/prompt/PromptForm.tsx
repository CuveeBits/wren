'use client'

/**
 * Adaptive form renderer for Prompt Library — Sprint 1.
 *
 * Reads a JSON Schema formSchema from the DB and renders a live form using
 * react-hook-form + zod for validation. Supports all field types defined in
 * the spec (ADR-016):
 *
 *   string (default)   → <Input>
 *   string + textarea  → <Textarea>
 *   string + select    → <Select> with enum values
 *   string + date      → <Input type="date">
 *   number             → <Input type="number">
 *   boolean            → <Checkbox>
 */
import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Label,
} from '@wren/ui'
import { Loader2 } from 'lucide-react'
import { useTranslations } from '@/i18n/translations-context'

// ─── JSON Schema types ────────────────────────────────────────────────────────

interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean'
  title?: string
  description?: string
  'x-field-type'?: 'textarea' | 'select' | 'date'
  'x-placeholder'?: string
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  enum?: string[]
  'x-enum-labels'?: string[]
}

export interface JSONSchema {
  type: 'object'
  required?: string[]
  properties: Record<string, JSONSchemaProperty>
}

export interface PromptFormProps {
  schema: JSONSchema
  formSchemaTranslated?: JSONSchema | null
  onSubmit: (values: Record<string, string>) => void
  isLoading?: boolean
}

// ─── Build Zod schema from JSON Schema ───────────────────────────────────────

function buildZodSchema(
  schema: JSONSchema
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  const required = schema.required ?? []

  for (const [name, prop] of Object.entries(schema.properties)) {
    const isRequired = required.includes(name)

    let fieldSchema: z.ZodTypeAny

    if (prop.type === 'boolean') {
      fieldSchema = z.boolean()
      if (!isRequired) fieldSchema = fieldSchema.optional()
    } else if (prop.type === 'number') {
      let numSchema = z.coerce.number()
      if (prop.minimum !== undefined) numSchema = numSchema.min(prop.minimum)
      if (prop.maximum !== undefined) numSchema = numSchema.max(prop.maximum)
      fieldSchema = isRequired ? numSchema : numSchema.optional()
    } else if (prop.enum && prop.enum.length > 0) {
      // string enum
      const enumSchema = z.enum(prop.enum as [string, ...string[]])
      fieldSchema = isRequired ? enumSchema : enumSchema.optional()
    } else {
      // plain string
      let strSchema = z.string()
      if (prop.minLength !== undefined) strSchema = strSchema.min(prop.minLength, `Minimum ${prop.minLength} characters`)
      if (prop.maxLength !== undefined) strSchema = strSchema.max(prop.maxLength, `Maximum ${prop.maxLength} characters`)
      if (isRequired) strSchema = strSchema.min(1, `${prop.title ?? name} is required`)
      fieldSchema = isRequired ? strSchema : strSchema.optional()
    }

    shape[name] = fieldSchema
  }

  return z.object(shape)
}

// ─── PromptForm ───────────────────────────────────────────────────────────────

export function PromptForm({ schema, formSchemaTranslated, onSubmit, isLoading = false }: PromptFormProps) {
  const t = useTranslations()
  const zodSchema = React.useMemo(() => buildZodSchema(schema), [schema])
  type FormValues = z.infer<typeof zodSchema>

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
  })

  // Use translated schema for rendering labels/placeholders if available,
  // but always use original schema for Zod validation (field names must match)
  const renderSchema = formSchemaTranslated ?? schema
  const fields = Object.entries(renderSchema.properties)

  const handleFormSubmit = (values: FormValues) => {
    // Convert all values to strings for the API
    const stringified: Record<string, string> = {}
    for (const [key, val] of Object.entries(values)) {
      stringified[key] = val === undefined || val === null ? '' : String(val)
    }
    onSubmit(stringified)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {fields.map(([name, prop]) => {
        const error = errors[name]
        const errorMessage = error?.message as string | undefined
        const fieldType = prop['x-field-type']
        const placeholder = prop['x-placeholder'] ?? ''
        const label = prop.title ?? name
        const description = prop.description

        return (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={name}>
              {label}
              {schema.required?.includes(name) && (
                <span className="ml-1 text-destructive" aria-hidden="true">*</span>
              )}
            </Label>

            {/* Boolean → Checkbox */}
            {prop.type === 'boolean' && (
              <div className="flex items-center gap-2">
                <Controller
                  name={name as never}
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id={name}
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                {description && (
                  <span className="text-sm text-muted-foreground">{description}</span>
                )}
              </div>
            )}

            {/* String + select → <select> */}
            {prop.type === 'string' && fieldType === 'select' && (
              <Select
                id={name}
                {...register(name as never)}
                aria-invalid={!!error}
              >
                <option value="">Select {label.toLowerCase()}…</option>
                {(prop.enum ?? []).map((value, idx) => (
                  <option key={value} value={value}>
                    {prop['x-enum-labels']?.[idx] ?? value}
                  </option>
                ))}
              </Select>
            )}

            {/* String + textarea */}
            {prop.type === 'string' && fieldType === 'textarea' && (
              <Textarea
                id={name}
                placeholder={placeholder}
                rows={4}
                {...register(name as never)}
                aria-invalid={!!error}
              />
            )}

            {/* String + date */}
            {prop.type === 'string' && fieldType === 'date' && (
              <Input
                id={name}
                type="date"
                {...register(name as never)}
                aria-invalid={!!error}
              />
            )}

            {/* Number */}
            {prop.type === 'number' && (
              <Input
                id={name}
                type="number"
                placeholder={placeholder}
                {...register(name as never)}
                aria-invalid={!!error}
              />
            )}

            {/* String (default, no x-field-type or unrecognized) */}
            {prop.type === 'string' && !fieldType && (
              <Input
                id={name}
                type="text"
                placeholder={placeholder}
                {...register(name as never)}
                aria-invalid={!!error}
              />
            )}

            {description && prop.type !== 'boolean' && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}

            {errorMessage && (
              <p className="text-xs text-destructive" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
        )
      })}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('prompt.generating')}
          </>
        ) : (
          t('prompt.generateAi')
        )}
      </Button>
    </form>
  )
}
