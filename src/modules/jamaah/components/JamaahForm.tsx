import React, { useState } from 'react'
import { Jamaah } from '@/stores/jamaahStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface JamaahFormProps {
  jamaah?: Jamaah
  onSubmit: (data: Omit<Jamaah, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
}

export function JamaahForm({ jamaah, onSubmit, onCancel }: JamaahFormProps) {
  const [formData, setFormData] = useState({
    nama: jamaah?.nama || '',
    email: jamaah?.email || '',
    noHp: jamaah?.noHp || '',
    alamat: jamaah?.alamat || '',
    noKartuKeluarga: jamaah?.noKartuKeluarga || '',
    statusKeluarga: jamaah?.statusKeluarga || 'jamaah',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
        <Input
          type="text"
          name="nama"
          value={formData.nama}
          onChange={handleChange}
          required
          placeholder="Full name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Email</label>
        <Input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
        <Input
          type="tel"
          name="noHp"
          value={formData.noHp}
          onChange={handleChange}
          placeholder="Phone number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Address</label>
        <Input
          type="text"
          name="alamat"
          value={formData.alamat}
          onChange={handleChange}
          placeholder="Address"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">ID Card Number</label>
        <Input
          type="text"
          name="noKartuKeluarga"
          value={formData.noKartuKeluarga}
          onChange={handleChange}
          placeholder="Family card number"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Family Status</label>
        <select
          name="statusKeluarga"
          value={formData.statusKeluarga}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-input rounded-md"
        >
          <option value="kepala_keluarga">Kepala Keluarga</option>
          <option value="istri">Istri</option>
          <option value="anak">Anak</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  )
}
