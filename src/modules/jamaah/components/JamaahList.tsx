import React, { useState } from 'react'
import { useJamaah } from '../useJamaah'
import { JamaahCard } from './JamaahCard'
import { JamaahForm } from './JamaahForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function JamaahList() {
  const { jamaah, isLoading, error, loadJamaah, create, delete: deleteJamaah } = useJamaah()
  const [showForm, setShowForm] = useState(false)

  const handleCreate = async (data: any) => {
    try {
      await create(data)
      setShowForm(false)
    } catch (err) {
      console.error('[v0] Failed to create jamaah:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this member?')) {
      await deleteJamaah(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">Anggota Jamaah</h1>
        <div className="flex gap-2">
          <Button onClick={() => loadJamaah()}>Refresh</Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add Member'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-red-50 border-red-200 p-4">
          <p className="text-red-900">{error}</p>
        </Card>
      )}

      {showForm && (
        <Card className="p-6">
          <JamaahForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      ) : jamaah.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No members added yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jamaah.map((member) => (
            <JamaahCard
              key={member.id}
              jamaah={member}
              onDelete={() => handleDelete(member.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
